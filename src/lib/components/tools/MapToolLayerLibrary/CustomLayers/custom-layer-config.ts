import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import { LayerConfig } from "$lib/map-core/layer-config";
import { Dispatcher } from "$lib/map-core/event/dispatcher";
import { buildGetCapabilitiesUrl } from "./capabilities";
import { v4 as uuid } from '@lukeed/uuid';


/** Empty (use the layer default) or a whole zoom level between 0 and 24. */
function isValidMaxZoom(value: unknown): boolean {
	if (value === undefined || value === null || value === "") return true;
	const zoom = Number(value);
	return Number.isInteger(zoom) && zoom >= 0 && zoom <= 24;
}


/** Empty, or an http(s) URL. */
export function isOptionalHttpUrl(value: unknown): boolean {
	if (value === undefined || value === null || String(value).trim() === "") return true;
	try {
		return ["https:", "http:"].includes(new URL(String(value)).protocol);
	} catch {
		return false;
	}
}


export class CustomLayerConfigTracker extends Dispatcher {
	
	public layerConfig: LayerConfig;
	public isValid: Writable<boolean> = writable(false);

	public titleInput: Writable<string>;
	public layerTypeInput: Writable<string>;
	public settingsInput: Writable<any>;
	public added: Writable<boolean>;

	public validType: Writable<boolean> = writable(false);
	public validUrl: Writable<boolean> = writable(false);

	private unsubscribers: Array<Unsubscriber> = new Array<Unsubscriber>();

	constructor(layerConfig?: LayerConfig) {
		super();
		this.layerConfig = layerConfig ?? new LayerConfig({id: uuid(), groupId: "myData", title: "New layer", settings: {}, defaultOn: true});
		this.titleInput = writable(this.layerConfig.title);
		this.layerTypeInput = writable(this.layerConfig.type);
		this.settingsInput = writable(this.layerConfig.settings);
		this.added = writable(get(this.layerConfig.added)); //Clone store

		this.setupValidators();
	}

	private setupValidators() {
		this.unsubscribers[0] = this.titleInput.subscribe((value) => {
			this.layerConfig.title = value;
			this.onInputChange();
		});

		this.unsubscribers[1] = this.layerTypeInput.subscribe((value) => {
			this.layerConfig.type = value;
			this.applyTypeDefaults(value);
			this.onInputChange();
		});

		this.unsubscribers[2] = this.settingsInput.subscribe((value) => {
			this.layerConfig.settings = value;
			this.onInputChange();
		});

		this.unsubscribers[3] = this.added.subscribe(async(value) => {
			if (value) {
				const exists = await this.checkIfUrlExists();
				if (!exists) {
					this.dispatch("urlError", {});
					this.added.set(false);
				} else {
					// Adding a My Data layer (new or restored) turns it on immediately.
					this.layerConfig.defaultOn = true;
					this.layerConfig.added.set(true);
				}
				this.dispatch("updated", {});
			} else {
				this.layerConfig.added.set(false);
				this.dispatch("updated", {});
			}
		});
	}


	private onInputChange(): void {
		this.validateLayerConfig();
		this.dispatch("updated", {});
		if (this.unsubscribers[3]) this.added.set(false); // Checking this.unsubscribers[3] to see if setup is finished
	}

	/**
	 * Enables sensible defaults for certain layer types. For WMS layers the legend
	 * and the style switcher are turned on automatically, so the dynamic legend and
	 * available styles are retrieved from the service's GetCapabilities.
	 */
	private applyTypeDefaults(type: string): void {
		if (type === "wms") {
			this.layerConfig.legendEnabled = true;
			const settings = get(this.settingsInput) ?? {};
			if (!settings.tools) settings.tools = {};
			if (!settings.tools.styleSwitcher) settings.tools.styleSwitcher = {};
			if (settings.tools.styleSwitcher.enabled !== true) {
				settings.tools.styleSwitcher.enabled = true;
				this.settingsInput.set(settings);
			}
		}
	}

	private validateType(type: string): boolean {
		return ["3dtiles", "wms", "wmts", "geojson", "modelanimation", "arcgis", "mvt"].includes(type);
	}

	private validateSettings(settings: any = this.layerConfig.settings): boolean {
		if (["wms", "wmts"].includes(this.layerConfig.type) && !settings["featureName"]) return false;
		if (["wms", "wmts"].includes(this.layerConfig.type) && !String(settings["contenttype"] ?? "").trim()) return false;
		if (this.layerConfig.type === "modelanimation" && (!settings["modelUrl"] || !settings["timeKey"])) return false;
		if (this.layerConfig.type === "mvt" && !isValidMaxZoom(settings["maxZoom"])) return false;
		if (this.layerConfig.type === "mvt" && !isOptionalHttpUrl(settings["styleUrl"])) return false;
		return true;
	}

	private validateUrl(settings: any = this.layerConfig.settings): boolean {
		if (!settings.url || !this.layerConfig.type) return false;
		try {
			const url = new URL(settings.url); // --> requires https:// at start
			if (!["https:", "http:"].includes(url.protocol)) return false;
			//if (this.layerConfig.type === "3dtiles" && !settings.url.endsWith("/tileset.json")) return false; //Google 3D Tiles does not end with tileset.json
			const href = url.href.toLowerCase();
			const pathname = url.pathname.toLowerCase();
			const search = url.search.toLowerCase();
			if (this.layerConfig.type === "wms" && !pathname.includes("/wms") && !pathname.includes("/ows") && !search.includes("service=wms")) return false;
			//if (this.layerConfig.type === "wmts" && !href.includes("wmts")) return false;
			if (this.layerConfig.type === "geojson" && !pathname.endsWith(".geojson")) return false;
			if (this.layerConfig.type === "modelanimation" && !pathname.endsWith(".geojson")) return false;
			// Checked on the raw string: URL() percent-encodes the braces of the template.
			if (this.layerConfig.type === "mvt" && !["{z}", "{x}", "{y}"].every((p) => settings.url.includes(p))) return false;
			return true; 
		} catch {
			return false;
		}
	}

	public validateLayerConfig(): void {
		this.validType.set(
			this.validateType(get(this.layerTypeInput))
		);
		this.validUrl.set(
			this.validateUrl(get(this.settingsInput))
		);
		const validSettings = this.validateSettings();
        this.isValid.set(
			get(this.validType) && get(this.validUrl) && validSettings
		);
		if (get(this.isValid) === false) this.added.set(false);
    }


	public async checkIfUrlExists(): Promise<boolean> {
		let url = this.layerConfig.settings.url;
		if (!url || !get(this.validUrl)) return false;
		if (this.layerConfig.type === "wms") url = buildGetCapabilitiesUrl(url, "wms");
		if (this.layerConfig.type === "wmts") url = buildGetCapabilitiesUrl(url, "wmts");
		// An MVT URL is a template: request the top-level tile. Empty tiles may come back as
		// 204 or 404, so any HTTP response (i.e. reachable, with CORS allowed) counts.
		const isMvt = this.layerConfig.type === "mvt";
		if (isMvt) url = url.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0");

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1000); // if no response after 1000ms, then consider the request as failed

		return fetch(url, { signal: controller.signal }).then((response) => {
			clearTimeout(timeout)
			return isMvt ? response.status < 500 : response.status === 200;
		}).catch(() => {
			clearTimeout(timeout)
			return false;
		});
	}


	public destroy() {
		for (let i = 0; i < this.unsubscribers.length; i++) {
			this.unsubscribers[i]();
		}
	}
}