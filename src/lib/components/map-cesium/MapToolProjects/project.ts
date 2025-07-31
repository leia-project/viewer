
import { get, writable, type Unsubscriber, type Writable } from "svelte/store";

import type { Map } from "$lib/components/map-cesium/module/map";
import { ProjectCamera } from "./project-camera";
import { ProjectClippingPlanes } from "./project-clip";
import { CameraLocation } from "$lib/components/map-core/camera-location";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type LayerConfigGroup from "../MapTools/MapToolLayerLibrary/LayerConfigGroup.svelte";

interface IProjectSettings {
	name: string;
	description: string;
	polygon: Array<[lon: number, lat: number]>;
	layers: Array<string>;
	cameraPosition: CameraLocation;
}


export class CesiumProject {

	private map: Map;
	public projectSettings: IProjectSettings;
	public coordinates: Array<[lon: number, lat: number]>;
	private layerNames: Array<string>;

	private projectClippingPlanes: ProjectClippingPlanes;
	public projectCamera: ProjectCamera;

	private savedLayers: Array<string> = [];

	private selectedProject: Writable<CesiumProject | undefined>;
	public selected: Writable<boolean> = writable(false);
	private selectedListener: Unsubscriber;

	private animationTime: number;
	public processing: boolean = false;

	constructor(map: Map, projectSettings: IProjectSettings, selectedProject: Writable<CesiumProject | undefined>, animationTime: number = 1500) {
		this.map = map;
		this.projectSettings = projectSettings;
		this.selectedProject = selectedProject;
		this.animationTime = animationTime;
		this.coordinates = this.closePolygon(projectSettings.polygon);
		this.layerNames = projectSettings.layers;
	
		this.projectCamera = new ProjectCamera(map, this.coordinates, this.animationTime, this.getCameraPosition(projectSettings));
		this.projectClippingPlanes = new ProjectClippingPlanes(map, this.coordinates);
		this.selectedListener = this.selectedProject.subscribe((project: CesiumProject | undefined) => {
			if (project === this && !get(this.selected)) this.activate();
			if (!project && get(this.selected)) this.deactivate();
		});
	}

	private activate(): void {
		this.processing = true;
		this.projectCamera.bound();
		setTimeout(() => {
			this.showProjectLayers();
			this.projectClippingPlanes.apply(this.layerNames);
			this.selected.set(true);
			this.processing = false;
		}, this.animationTime);
	}

	public deactivate(): void {
		this.resetLayers();
		this.projectClippingPlanes.remove();
		this.projectCamera.unbound();
		this.selected.set(false);
		this.map.viewer.scene.requestRender();
	}


	public showProjectLayers(): void {
		// Save active layers
		const mapLayers = get(this.map.layers);
		for (let i=0; i<mapLayers.length; i++) {
			const layer = mapLayers[i];
			if (layer.config.isBackground) continue;
			if (get(layer.visible)) {
				this.savedLayers.push(layer.config.id);
				layer.visible.set(false);
			}
		}

	
		for (let i=0; i<this.layerNames.length; i++) {
			const layer = this.map.getLayerByTitle(this.layerNames[i]);
			if (layer) layer.visible.set(true);
		}


		// Show project layers
		for (let i=0; i<this.layerNames.length; i++) {
			const layerConfig = this.findLayer(this.layerNames[i]);
			if (layerConfig) {
				layerConfig.added.set(true);
				setTimeout(() => {
					const layer = this.map.getLayerByTitle(this.layerNames[i]);
					layer.visible.set(true)
				}, 0);
			};
		}
	
	}

	private resetLayers(): void {
		// Hide project layers
		for (let i=0; i<this.layerNames.length; i++) {
			const layer = this.map.getLayerByTitle(this.layerNames[i]);
			if (layer) layer.visible.set(false);
		}

		// Restore layers
		this.savedLayers.forEach((layerId: string) => {
			const layer = this.map.getLayerById(layerId);
			layer.visible.set(true);
		});
		this.savedLayers = [];
	}

	private destroy(): void {
		if (this.selected) this.deactivate();
		this.selectedListener();
	}





	public findLayer(layerTitle: string): LayerConfig | undefined {
        return this.findLayerRecursive(layerTitle, get(this.map.layerLibrary.groups));
    }

    private findLayerRecursive(layerTitle: string, groups: Array<LayerConfigGroup>): LayerConfig | undefined {
        for(let i = 0; i < groups.length; i++) {
            const layerConfigs = get(groups[i].layerConfigs);
            if(layerConfigs.length > 0) {
                for(let j = 0; j < layerConfigs.length; j++) {
                    if(layerConfigs[j].title === layerTitle) {
                        return layerConfigs[j];
                    }
                }
            }

            const childGroups = get(groups[i].childGroups);
            if(childGroups.length > 0) {
                const rec = this.findLayerRecursive(layerTitle, get(groups[i].childGroups));
                if(rec) {
                    return rec;
                }
            }
        }

        return undefined;
    }


	private closePolygon(coordinates: Array<[lon: number, lat: number]>): Array<[lon: number, lat: number]> {
		if (coordinates.length > 0) {
			const firstPoint = coordinates[0];
			const lastPoint = coordinates[coordinates.length - 1];
			if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
				// The polygon is not closed, close it
				coordinates.push(firstPoint);
			}
		}
		return coordinates;
	}

	private getCameraPosition(projectSettings: IProjectSettings): CameraLocation | undefined {
		const cameraPosition = projectSettings.cameraPosition;
		if (
			cameraPosition?.x !== undefined &&
			cameraPosition?.y !== undefined &&
			cameraPosition?.z !== undefined &&
			cameraPosition?.heading !== undefined &&
			cameraPosition?.pitch !== undefined &&
			cameraPosition?.duration !== undefined
		) {
			return new CameraLocation(
				cameraPosition.x, 
				cameraPosition.y, 
				cameraPosition.z, 
				cameraPosition.heading, 
				cameraPosition.pitch, 
				cameraPosition.duration
			);
		}
		return undefined;
	}
}