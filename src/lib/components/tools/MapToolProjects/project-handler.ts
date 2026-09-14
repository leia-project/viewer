import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { CameraLocation } from "$lib/map-core/camera-location";
import type { CesiumProjectBase } from "./classes/project";
import type { Map } from "$lib/map-cesium/map";

export interface IProjectConfig {
	name: string;
	description: string;
	logo?: string;
	icon?: string;
	iconVerticalOrigin?: string;
	iconHorizontalOrigin?: string;
	polygon: Array<[lon: number, lat: number]>;
	layers?: Array<{ id: string; on: boolean; tileset?: string }>;
	cameraPosition?: CameraLocation;
}

export interface IProjectTileset {
	title: string;
	url: string;
	tileset: Writable<Promise<Cesium.Cesium3DTileset> | void>;
}

export interface IProjectToolConfig<Config> {
	projects: Array<Config>;
	openProject?: string;
	appearance?: {
		listAll?: boolean; //"dropdown" | "list";
		clip?: boolean;
		liteMode?: boolean; // "default" | "light";
		parentTool?: string;
	};
	soConnect?: boolean;
}

class ProjectHandler {
	public selectedProject: Writable<CesiumProjectBase<any, any> | undefined>;
	private scratchProject: CesiumProjectBase<any, any> | undefined;
	public clip: Writable<boolean>;

	private scratchMap: Map | undefined;
	private savedLayers: Array<string> = [];

	public showDefaultWidget: boolean = true;
	public showClipToggleInWidget: boolean = false;

	constructor() {
		this.selectedProject = writable(undefined);
		this.clip = writable(true);
		this.addSubscribers();
	}

	private addSubscribers(): void {
		this.selectedProject.subscribe((project) => {
			if (project && !this.scratchProject) {
				this.savedLayers = this.getActiveLayers(project.map); // Save the active layers when entering a project (not when directly switching), so we can restore them when leaving
			}
			this.scratchProject?.deactivate();
			if (project) {
				project.activate();
			} else {
				this.restoreSavedLayers();
			}
			this.scratchProject = project;
		});

		this.clip.subscribe((clip) => {
			this.scratchProject?.cutout(clip);
		});
	}

	private getActiveLayers(map: Map): Array<string> {
		const activeLayers: Array<string> = [];
		const mapLayers = get(map.layers);
		for (let i = 0; i < mapLayers.length; i++) {
			const layer = mapLayers[i];
			if (layer.config.isBackground) continue;
			if (get(layer.visible)) {
				activeLayers.push(layer.config.id);
				layer.visible.set(false);
			}
		}
		this.scratchMap = map;
		return activeLayers;
	}

	private restoreSavedLayers(): void {
		this.savedLayers.forEach((layerId: string) => {
			const layer = this.scratchMap?.getLayerById(layerId);
			if (layer) layer.visible.set(true);
		});
		this.savedLayers = [];
	}
}

export const projectHandler = new ProjectHandler();
