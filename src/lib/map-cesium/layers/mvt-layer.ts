import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";

import { CesiumLayer } from "./cesium-layer";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import { MvtProviderCesium, type MvtAccess } from "../providers/mvt-provider";

import type { DataDrivenStyle } from "../providers/mvt-style";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";

export interface MvtProperty {
	name: string;
	kind: "number" | "text";
}

/* Een laag met vector tiles (MVT) van een XYZ-tileservice. De laag leest zijn configuratie en
   regelt zichtbaarheid en camerapositie; het tekenen is aan MvtProviderCesium (providers/).

   settings:
     url            URL-sjabloon met {z}, {x} en {y}. Een credential moet in de URL zitten:
                    Cesium stuurt geen headers mee bij tile-verzoeken.
     extent         [west, zuid, oost, noord] in graden
     maxZoom        hoogste zoomniveau dat de service levert (standaard 14)
     color          basiskleur (css) zonder kleuring op eigenschap
     properties     [{ name, kind }] - eigenschappen waarop gekleurd kan worden
     accessExpires  unix-tijd (s) waarop het token in de URL verloopt
     accessIssuedAt unix-tijd (s) waarop het is uitgegeven
     renewAccess    () => Promise<{ url, accessExpires }>: een nieuwe URL. De laag roept het zelf
                    aan voordat het oude token verloopt. Een functie, zodat een sessietoken in
                    de sluiting blijft en niet in de zichtbare instellingen staat.
     swapTimeoutMs  hoe lang de oude tiles blijven staan terwijl de vernieuwde laag laadt
     Andere sleutels laat de laag ongemoeid: ze zijn voor wie de laag heeft aangemaakt. */
export class MvtLayer extends CesiumLayer<MvtProviderCesium> {
	/* Wat de kleuring nu is, voor wie het wil tonen. */
	public dataDriven: Writable<DataDrivenStyle | undefined> = writable(undefined);

	/* Klaar als de tiles in de scene staan; weigert als dat niet lukt. */
	public ready!: Promise<void>;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.config.transparent = this.config.transparent ?? false;
		const settings = this.config.settings;

		const extent: number[] | undefined = settings["extent"];
		if (extent) {
			/* Zodat "vlieg naar" werkt, net als bij de laagbeheerder. */
			const sphere = Cesium.BoundingSphere.fromRectangle3D(
				Cesium.Rectangle.fromDegrees(...(extent as [number, number, number, number]))
			);
			this.map.options.use3DMode.subscribe((use3D) => {
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(sphere, use3D);
			});
		}

		/* Zet de provider ook in de scene (zie addToMap). */
		this.source = new MvtProviderCesium(settings["url"], {
			extent: extent as [number, number, number, number] | undefined,
			maxZoom: settings["maxZoom"],
			color: settings["color"],
			accessExpires: settings["accessExpires"],
			accessIssuedAt: settings["accessIssuedAt"],
			renewAccess: settings["renewAccess"] as (() => Promise<MvtAccess>) | undefined,
			swapTimeoutMs: settings["swapTimeoutMs"],
			/* De instellingen van de laag blijven kloppen met wat er nu gebruikt wordt. */
			onRenewed: ({ url, accessExpires, accessIssuedAt }) => {
				settings["url"] = url;
				settings["accessExpires"] = accessExpires;
				settings["accessIssuedAt"] = accessIssuedAt;
			}
		});
	}

	public get properties(): MvtProperty[] {
		return this.config.settings["properties"] ?? [];
	}

	/* Kleur de objecten op een eigenschap; `undefined` zet de basiskleur terug. De klassen
	   (waarden of grenzen) bepaalt wie dit aanroept: een tile bevat alleen wat in beeld is. */
	public setDataDrivenStyle(style: DataDrivenStyle | undefined): void {
		this.source.setStyle(style);
		this.dataDriven.set(style);
	}

	/* Vernieuwt de tile-URL als het token oud wordt; zie MvtProviderCesium.renewIfNeeded. */
	public renewIfNeeded(now?: number): Promise<boolean> {
		return this.source.renewIfNeeded(now);
	}

	public addToMap(): void {
		this.ready = this.source.addToMap(this.map, get(this.visible));
		/* Wie niet op `ready` wacht (de kaart zelf), hoeft geen onbehandelde fout te krijgen. */
		this.ready.catch((error) => {
			console.error(`Kon de MVT-laag "${this.config.title}" niet laden:`, error);
			this.config.added.set(false);
		});
	}

	public removeFromMap(): void {
		this.source.removeFromMap();
	}

	public show(): void {
		this.source?.show();
	}

	public hide(): void {
		this.source?.hide();
	}

	public opacityChanged(_opacity: number): void {
		/* MVTDataProvider kent (nog) geen doorzichtigheid; de kleur komt uit de stijl. */
	}
}
