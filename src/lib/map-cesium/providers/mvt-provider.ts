import * as Cesium from "cesium";

import { nextLayerColor, tileStyleDefinition, type DataDrivenStyle } from "./mvt-style";
import { RENEWAL_CHECK_MS, needsRenewal } from "./tile-access";

import type { Map } from "../map";

/* Een nieuwe tile-URL met zijn nieuwe verloopmoment (unix-tijd in seconden). */
export interface MvtAccess {
	url: string;
	accessExpires: number;
}

export interface MvtProviderOptions {
	/* [west, zuid, oost, noord] in graden: beperkt de tiles die worden opgevraagd. */
	extent?: [number, number, number, number];
	/* Hoogste zoomniveau dat de tile-service levert (standaard 14). */
	maxZoom?: number;
	/* Kleur (css) zonder kleuring op eigenschap; standaard de volgende kleur uit het palet. */
	color?: string;

	/* Voor een URL die een toegangstoken bevat dat verloopt: wanneer dat is, en hoe je een
	   nieuwe URL krijgt. De provider vraagt die zelf vóór het oude token verloopt. Zonder
	   `renewAccess` blijft de URL zoals hij is. */
	accessExpires?: number;
	accessIssuedAt?: number;
	renewAccess?: () => Promise<MvtAccess>;
	/* Hoe lang de oude tiles blijven staan terwijl de vernieuwde provider laadt (standaard 10000). */
	swapTimeoutMs?: number;
	/* Meldt dat de URL en het verloopmoment zijn vernieuwd. */
	onRenewed?: (access: MvtAccess & { accessIssuedAt: number }) => void;
}

/* Tekent vector tiles (MVT) van elke XYZ-tileservice met Cesium's MVTDataProvider, dat de
   tiles omzet naar 3D Tiles. Weet niets van wie de tiles levert: het enige wat het nodig heeft
   is een URL-sjabloon met {z}, {x} en {y}.

   MVTDataProvider is in CesiumJS 1.146 nog `@experimental`: de API kan veranderen zonder de
   gebruikelijke waarschuwingsperiode.

   Twee dingen die Cesium zelf niet goed doet, en dit wel:
   - Zonder stijl tekent Cesium elk punt als één pixel (vastgesteld met een headless browser:
     632 punten werden 27 pixels) en vlakken wit. Er is daarom altijd een basisstijl.
   - Cesium bouwt elk tile-adres alleen uit het URL-sjabloon: headers op de Resource worden
     genegeerd. Een credential moet dus in de URL zitten. Zo'n token verloopt; zie renewIfNeeded. */
export class MvtProviderCesium {
	/* Net als bij WFSProviderCesium: de laag die hem gebruikt. */
	public configId = "";

	private url: string;
	private readonly options: MvtProviderOptions;
	private readonly baseColor: string;

	private map: Map | undefined;
	private current: Cesium.MVTDataProvider | undefined;
	/* De provider die tijdens een wissel nog in beeld staat tot de nieuwe zijn eerste tiles heeft. */
	private retiring: Cesium.MVTDataProvider | undefined;
	private style: DataDrivenStyle | undefined;
	private showing = true;
	private accessExpires: number | undefined;
	private accessIssuedAt: number | undefined;
	private renewTimer: ReturnType<typeof setInterval> | undefined;
	private renewing = false;
	private removed = false;

	constructor(url: string, options: MvtProviderOptions = {}) {
		this.url = url;
		this.options = options;
		this.baseColor = options.color ?? nextLayerColor();
		this.accessExpires = options.accessExpires;
		this.accessIssuedAt = options.accessIssuedAt;
	}

	/* De tileset van de provider die nu getekend wordt. */
	public get tileset(): Cesium.Cesium3DTileset | undefined {
		return this.current?.tileset;
	}

	/* De kleuring op eigenschap die nu geldt, als die er is. */
	public get dataDriven(): DataDrivenStyle | undefined {
		return this.style;
	}

	private create(url: string, map: Map): Promise<Cesium.MVTDataProvider> {
		const extent = this.options.extent;
		return Cesium.MVTDataProvider.fromUrl(url, {
			minZoom: 0,
			maxZoom: this.options.maxZoom ?? 14,
			extent: extent ? Cesium.Rectangle.fromDegrees(...extent) : undefined,
			/* Op het terrein leggen in plaats van erin te zakken. */
			heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
			scene: map.viewer.scene
		});
	}

	/* Altijd een stijl, ook zonder kleuring op eigenschap: zonder zijn punten één pixel groot. */
	private applyStyle(provider: Cesium.MVTDataProvider, style: DataDrivenStyle | undefined): void {
		const tileset = provider.tileset;
		if (tileset) {
			tileset.style = new Cesium.Cesium3DTileStyle(tileStyleDefinition(style, this.baseColor));
		}
	}

	/* destroy() bestaat (UrlTemplate3DTilesDataProvider), maar staat niet in de typings. */
	private destroy(provider: Cesium.MVTDataProvider): void {
		(provider as unknown as { destroy(): void }).destroy();
	}

	public async addToMap(map: Map, show: boolean = true): Promise<void> {
		this.map = map;
		this.showing = show;

		const provider = await this.create(this.url, map);
		if (this.removed) {
			/* De laag is weggehaald terwijl de provider werd aangemaakt. */
			this.destroy(provider);
			return;
		}
		this.applyStyle(provider, this.style);
		provider.show = show;
		map.viewer.scene.primitives.add(provider);
		this.current = provider;
		map.refresh();

		if (this.options.renewAccess) {
			this.renewTimer = setInterval(() => {
				this.renewIfNeeded().catch((error) =>
					/* Bij de volgende controle opnieuw, terwijl het oude token nog tijd heeft. */
					console.warn("Kon de toegang tot de tiles niet verlengen:", error)
				);
			}, RENEWAL_CHECK_MS);
		}
	}

	public removeFromMap(): void {
		this.removed = true;
		clearInterval(this.renewTimer);
		if (this.map) {
			/* Tijdens een wissel staan er even twee providers in de scene. */
			for (const provider of [this.current, this.retiring]) {
				if (provider) this.map.viewer.scene.primitives.remove(provider);
			}
			this.map.refresh();
		}
		this.current = undefined;
		this.retiring = undefined;
	}

	public show(): void {
		this.showing = true;
		if (this.current) this.current.show = true;
		this.map?.refresh();
	}

	public hide(): void {
		this.showing = false;
		if (this.current) this.current.show = false;
		this.map?.refresh();
	}

	/* Kleur de objecten op een eigenschap; `undefined` zet de basiskleur terug. */
	public setStyle(style: DataDrivenStyle | undefined): void {
		if (!this.current?.tileset) {
			throw new Error("De tiles zijn nog niet geladen.");
		}
		this.style = style;
		this.applyStyle(this.current, style);
		this.map?.refresh();
	}

	/* Haalt een nieuwe URL als het huidige toegangstoken oud wordt. Cesium kan de URL van een
	   provider niet aanpassen (elk tile-adres is bij het aanmaken al uitgerekend), dus er komt
	   een nieuwe provider voor in de plaats. De oude blijft in beeld tot de nieuwe zijn eerste
	   tiles heeft: zijn token is immers nog geldig. De kleuring blijft behouden. Geeft terug of
	   er verlengd is. */
	public async renewIfNeeded(now = Math.floor(Date.now() / 1000)): Promise<boolean> {
		const renew = this.options.renewAccess;
		const map = this.map;
		if (!renew || !map || this.renewing || this.removed || !this.current) return false;
		if (this.accessExpires === undefined || this.accessIssuedAt === undefined) return false;
		if (!needsRenewal(this.accessExpires, this.accessIssuedAt, now)) return false;

		this.renewing = true;
		try {
			const access = await renew();
			const next = await this.create(access.url, map);
			if (this.removed) {
				/* De laag is weggehaald terwijl we wachtten. */
				this.destroy(next);
				return false;
			}

			const previous = this.current;
			this.applyStyle(next, this.style);
			next.show = this.showing;
			map.viewer.scene.primitives.add(next);
			this.current = next;
			this.retiring = previous;

			await this.firstTiles(next, this.options.swapTimeoutMs ?? 10_000);
			if (this.retiring === previous) {
				map.viewer.scene.primitives.remove(previous);
				this.retiring = undefined;
			}
			map.refresh();

			this.url = access.url;
			this.accessExpires = access.accessExpires;
			this.accessIssuedAt = now;
			this.options.onRenewed?.({ ...access, accessIssuedAt: now });
			return true;
		} finally {
			this.renewing = false;
		}
	}

	/* Klaar zodra de provider de tiles voor de huidige kijkhoek heeft - of na een tijdslimiet,
	   zodat een tileset die niets te laden heeft de wissel niet voor altijd tegenhoudt. */
	private firstTiles(provider: Cesium.MVTDataProvider, timeoutMs: number): Promise<void> {
		return new Promise((resolve) => {
			let remove: (() => void) | undefined;
			const done = () => {
				clearTimeout(timer);
				remove?.();
				resolve();
			};
			const timer = setTimeout(done, timeoutMs);
			remove = provider.tileset?.allTilesLoaded.addEventListener(done);
		});
	}
}
