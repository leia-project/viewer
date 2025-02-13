import type { Map } from "../module/map";
import { LayerConfig } from "$lib/components/map-core/layer-config";
import type { IconLayer } from "../module/layers/icon-layer";
import type { FloodLayer } from "../module/layers/flood-layer";
import type { OgcFeaturesLayer } from "../module/layers/ogc-features-layer";
import { get, writable, type Writable } from "svelte/store";
import { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";
import { Parameter } from "carbon-icons-svelte";


export interface FloodToolSettings {
	scenariosBaseUrl: string;
	breachUrl: string;
	roadsUrl: string;
	floodedRoadsUrl: string;
}

export interface Breach {
	type: string;
	geometry: {
		type: string;
		coordinates: Array<number>;
	};
	properties: {
		name: string;
		dijkring: string;
		scenarios: Array<string>;
	};
}


export class FloodLayerController {

	private map: Map;
	public activeBreach: Writable<Breach | undefined>;
	public selectedScenario: Writable<string | undefined> = writable(undefined);
	
	public time: Writable<number> = writable(0);
	public minTime: Writable<number> = writable(0);
	public maxTime: Writable<number> = writable(1);
	public speed: Writable<number> = writable(1);

	public opacity: Writable<number> = writable(1);

	public layerConfigGroup: LayerConfigGroup = new LayerConfigGroup("overstromingen", "Overstromingen");
	public iconLayer: IconLayer<Breach>;
	public floodLayer: FloodLayer;
	//public roadsLayer?: OgcFeaturesLayer;
	public floodedRoadsLayer: OgcFeaturesLayer;

	constructor(map: Map, settings: FloodToolSettings, activeBreach: Writable<Breach | undefined>, selectedScenario: Writable<string | undefined>) {
		this.map = map;
		this.activeBreach = activeBreach;
		this.selectedScenario = selectedScenario;
		this.map.layerLibrary.addLayerConfigGroup(this.layerConfigGroup);
		this.iconLayer = this.addIconLayer();
		this.floodLayer = this.addFloodLayer(settings.scenariosBaseUrl);
		this.floodedRoadsLayer = this.addFloodedRoadsLayer("http://localhost:5000");
		
		this.activeBreach.subscribe(() => {
			this.selectedScenario.set(undefined);
			this.floodLayer.clear();
			this.time.set(0);
		});
		this.selectedScenario.subscribe((scenario) => {
			const breach = get(this.activeBreach);
			if (breach && scenario) {
				this.loadNewScenario(breach, scenario);
			}
		});
		this.time.subscribe((time) => {
			const breach = get(this.activeBreach);
			const scenario = get(this.selectedScenario) || 'geen_scenario';
			if (breach && scenario) {
			const scenarioId = `${breach?.properties.dijkring}_${breach?.properties.name}_${scenario}`;
			const timestring = (Math.round(time) * 6).toString().padStart(5, "0")
			const parameters ={
				scenario: scenarioId, 
				timestep: timestring, 
				limit: "666"}
			this.floodedRoadsLayer.source.switchUrl(settings.floodedRoadsUrl, parameters);
			};
		});
	}

	// whenever the time changes, update the flooded roads layer


	public showAll(): void {
		this.iconLayer?.show();
		this.floodLayer?.show();
		//this.roadsLayer?.show();
		this.floodedRoadsLayer?.show();
	}

	
	public addBreaches(breaches: Array<Breach>): void {
		this.iconLayer?.loadFeatures(breaches);
	}

	public async loadNewScenario(breach: Breach, scenario: string): Promise<void> {
		if (this.floodLayer) {
			this.floodLayer.loadScenario(breach, scenario).then(() => {
				const numberOfSteps = this.floodLayer.source?.waterLevels.length;
				this.maxTime.set(numberOfSteps);
			});
		}
		
		const scenarioId = `${breach.properties.dijkring}_${breach.properties.name}_${scenario}`;
		const endpoint = this.floodedRoadsLayer.config.settings.url;
		const parameters = {
			scenario: scenarioId, //breach.properties.scenarios[0],
			timestep: (Math.round(get(this.time)) * 6).toString().padStart(5, "0"),
			limit: "69"
		}
		console.log("Switching flooded roads layer to new scenario", scenarioId, parameters);
		this.floodedRoadsLayer?.source.switchUrl(endpoint, parameters);
	}

	private addIconLayer(): IconLayer<Breach> {
		// add icon layer with breach locations
		const layerConfig = new LayerConfig({
			id: "fl_breachicons",
			title: "Breach Locations",
			type: "icon",
			groupId: this.layerConfigGroup.id,
			isBackground: false,
			defaultOn: true,
			defaultAddToManager: true,
		});
		//const layer = this.map.addLayer(layerConfig) as IconLayer<Breach>;
		this.map.layerLibrary.addLayerConfig(layerConfig);
		layerConfig.added.set(true);
		const layer = get(this.map.layers).find((l) => l.id === layerConfig.id) as IconLayer<Breach>;
		layer.activeStore = this.activeBreach;
		return layer;
	}

	private addFloodLayer(baseUrl: string): FloodLayer {
		const layerConfig = new LayerConfig({
			id: "flood_layer_fier",
			type: "flood",
			title: "Flood layer",
			groupId: this.layerConfigGroup.id,
			legendUrl: "",
			isBackground: false,
			defaultAddToManager: true,
			defaultOn: true,
			transparent: false,
			opacity: 0,
			settings: {
				resolution: 50,
				url: baseUrl
			}
		});
		this.map.layerLibrary.addLayerConfig(layerConfig);
		layerConfig.added.set(true);
		const floodLayer = get(this.map.layers).find((l) => l.id === layerConfig.id) as FloodLayer;
		floodLayer.time = this.time;
		floodLayer.opacity = this.opacity;
		return floodLayer;
	}

	/*
	public addRoadsLayer(): void {
		const layerConfig = new LayerConfig({
			id: "all_roads",
			title: "Wegen",
			type: "ogc-features",
			settings: {
				"url": "http://localhost:5000/",
				"options": {
					"collectionId": "nwb",
					"heightStartLoading": 50000,
					"maxFeatures": 10,
					"tileWidth": 1024
				}
			},
			isBackground: false,
			defaultOn: true,
			defaultAddToManager: false,
		});
		this.roadsLayer = this.map.addLayer(layerConfig) as OgcFeaturesLayer;
		this.roadsLayer.opacity = this.opacity;
	}
	*/

	private addFloodedRoadsLayer(baseUrl: string): OgcFeaturesLayer {
		const layerConfig = new LayerConfig({
			id: "flooded_roads",
			title: "Wegen",
			type: "ogc-features",
			groupId: this.layerConfigGroup.id,
			settings: {
				url: baseUrl,
				options: {
					collectionId: "nwb_floods",
					heightStartLoading: 50000,
					maxFeatures: 10000,
					tileWidth: 40640
				},
				parameters: { 
					scenario: get(this.selectedScenario)?.toString(), //"26_NzSch-dp_160_300",
					// "scenario": layerId, // scenario not yet formatted correctly in data
					timestep: (Math.round(get(this.time)) * 6).toString().padStart(5, "0"),
					limit: "420"
				},
				hideInLayerManager: false,
				dragDropped: false
	
			},
			isBackground: false,
			defaultOn: true,
			defaultAddToManager: true
		});
		console.log("Adding flooded roads layer", layerConfig);
		this.map.layerLibrary.addLayerConfig(layerConfig);
		layerConfig.added.set(true);
		const floodedRoadsLayer = get(this.map.layers).find((l) => l.id === layerConfig.id) as OgcFeaturesLayer;
		floodedRoadsLayer.opacity = this.opacity;
		return floodedRoadsLayer;
	}
}
