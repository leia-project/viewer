import * as Cesium from "cesium";
import { writable, get } from "svelte/store";
import { Get3dLayers } from "./utils/map-utils";

import type { Writable } from "svelte/store";
import type { Map } from "./map";

export class MapOptions {
	private map: Map;

	public dateTime: Writable<number> = writable<number>(1720602000 * 1000); // 10-07-2024 11:00:00
	public shadows: Writable<boolean> = writable<boolean>(false);
	public fxaa: Writable<boolean> = writable<boolean>(false);
	public animate: Writable<boolean> = writable<boolean>(false);
	public resolutionScale: Writable<number> = writable<number>(1);
	public maximumScreenSpaceError: Writable<number> = writable<number>(1.2);
	public groundAtmosphere: Writable<boolean> = writable<boolean>(true);
	public lighting: Writable<boolean> = writable<boolean>(true);
	public msaa: Writable<number> = writable<number>(4);
	public skyAtmosphere: Writable<boolean> = writable<boolean>(true);
	public fog: Writable<boolean> = writable<boolean>(true);
	public highDynamicRange: Writable<boolean> = writable<boolean>(false);
	public fpsCounter: Writable<boolean> = writable<boolean>(false);
	public showMouseCoordinates: Writable<boolean> = writable<boolean>(false);
	public showCameraPosition: Writable<boolean> = writable<boolean>(false);
	public showAnimationWidget: Writable<boolean> = writable<boolean>(false);
	public showLoadingWidget: Writable<boolean> = writable<boolean>(true);
	public enableDragDropFiles: Writable<boolean> = writable<boolean>(true);
	public globeOpacity: Writable<number> = writable<number>(100);
	public inspector: Writable<boolean> = writable<boolean>(false);
	public proMode: Writable<boolean> = writable<boolean>(false);
	public terrainProviders: Writable<Array<{ title: string, url: string, vertexNormals: boolean }>> = writable<Array<{ title: string, url: string, vertexNormals: boolean }>>(new Array<{ title: string, url: string, vertexNormals: boolean}>());
	public selectedTerrainProvider: Writable<{ title: string, url: string, vertexNormals: boolean }> = writable<{ title: string, url: string, vertexNormals: boolean }>(undefined);
	public terrainSwitchReady: Writable<boolean> = writable(false);
	public selectedProject: Writable<string | undefined> = writable(undefined);
	public use3DMode: Writable<boolean> = writable(true);

	public pointCloudAttenuation: Writable<boolean> = writable<boolean>(true);
	public pointCloudAttenuationMaximum: Writable<number> = writable<number>(0);
	public pointCloudAttenuationErrorScale: Writable<number> = writable<number>(1);
	public pointCloudAttenuationBaseResolution: Writable<number> = writable<number>(0);

	public pointCloudEDL: Writable<boolean> = writable<boolean>(true);
	public pointCloudEDLStrength: Writable<number> = writable<number>(1);
	public pointCloudEDLRadius: Writable<number> = writable<number>(1);

	constructor(map: Map) {
		this.map = map;

		this.subscribe<number>(this.dateTime, (v) => {
			this.setDateTime(v);
		});
		this.subscribe<boolean>(this.shadows, (v) => {
			this.map.viewer.shadows = v;
		});
		this.subscribe<boolean>(this.fxaa, (v) => {
			this.map.viewer.scene.postProcessStages.fxaa.enabled = v;
		});
		this.subscribe<boolean>(this.animate, (v) => {
			this.map.viewer.clock.shouldAnimate = v;
		});
		this.subscribe<number>(this.resolutionScale, (v) => {
			this.map.viewer.resolutionScale = v;
		});
		this.subscribe<number>(this.maximumScreenSpaceError, (v) => {
			this.map.viewer.scene.globe.maximumScreenSpaceError = v;
		});
		this.subscribe<boolean>(this.groundAtmosphere, (v) => {
			this.map.viewer.scene.globe.showGroundAtmosphere = v;
		});
		this.subscribe<boolean>(this.lighting, (v) => {
			this.map.viewer.scene.globe.enableLighting = v;
		});
		this.subscribe<number>(this.msaa, (v) => {
			this.map.viewer.scene.msaaSamples = v;
		});
		this.subscribe<boolean>(this.skyAtmosphere, (v) => {
			this.map.viewer.scene.skyAtmosphere.show = v;
		});
		this.subscribe<boolean>(this.fog, (v) => {
			this.map.viewer.scene.fog.enabled = v;
		});
		this.subscribe<boolean>(this.highDynamicRange, (v) => {
			this.map.viewer.scene.highDynamicRange = v;
		});
		this.subscribe<boolean>(this.fpsCounter, (v) => {
			this.map.viewer.scene.debugShowFramesPerSecond = v;
		});
		this.subscribe<number>(this.globeOpacity, (v) => {
			this.setGlobeOpacity(v);
		});
		this.subscribe<boolean>(this.pointCloudAttenuation, (v) => {
			this.setPointCloudSetting("attenuation", v);
		});
		this.subscribe<number>(this.pointCloudAttenuationBaseResolution, (v) => {
			this.setPointCloudSetting("attenuationBaseResolution", v);
		});
		this.subscribe<number>(this.pointCloudAttenuationErrorScale, (v) => {
			this.setPointCloudSetting("attenuationErrorScale", v);
		});
		this.subscribe<number>(this.pointCloudAttenuationMaximum, (v) => {
			this.setPointCloudSetting("attenuationMaximum", v);
		});
		this.subscribe<boolean>(this.pointCloudEDL, (v) => {
			this.setPointCloudSetting("edl", v);
		});
		this.subscribe<number>(this.pointCloudEDLRadius, (v) => {
			this.setPointCloudSetting("edlRadius", v);
		});
		this.subscribe<number>(this.pointCloudEDLStrength, (v) => {
			this.setPointCloudSetting("edlStrength", v);
		});
		this.subscribe<boolean>(this.inspector, (v) => {
			this.switchTileInspector(v);
		});
		this.subscribe<{ title: string, url: string, vertexNormals: boolean }>(this.selectedTerrainProvider, (v) => {
			this.terrainSwitchReady.set(false);
			this.switchTerrainProvider(v);
		});
	}

	public loadFromConfig(config: any): void {
		this.trySet(this.dateTime, config.dateTime ? config.dateTime * 1000 : get(this.dateTime));
		this.setDateTime(get(this.dateTime));
		this.trySet(this.shadows, config.shadows);
		this.trySet(this.showMouseCoordinates, config.showMouseCoordinates);
		this.trySet(this.showCameraPosition, config.showCameraPosition);
		this.trySet(this.showLoadingWidget, config.showLoadingWidget);
		this.trySet(this.showAnimationWidget, config.showAnimationWidget);
		this.trySet(this.enableDragDropFiles, config.enableDragDropFiles);
		this.trySet(this.fxaa, config.fxaa);
		this.trySet(this.msaa, config.msaa);
		this.trySet(this.animate, config.animate);
		this.trySet(this.resolutionScale, config.resolutionScale);
		this.trySet(this.maximumScreenSpaceError, config.maximumScreenSpaceError);
		this.trySet(this.groundAtmosphere, config.showGroundAtmosphere);
		this.trySet(this.lighting, config.lighting);
		this.trySet(this.skyAtmosphere, config.skyAtmosphere);
		this.trySet(this.fog, config.fog);
		this.trySet(this.highDynamicRange, config.highDynamicRange);
		this.trySet(this.pointCloudAttenuation, config.pointCloudAttenuation);
		this.trySet(this.pointCloudAttenuationMaximum, config.pointCloudAttenuationMaximum);
		this.trySet(this.pointCloudAttenuationErrorScale, config.pointCloudAttenuationErrorScale);
		this.trySet(this.pointCloudAttenuationBaseResolution, config.pointCloudBaseResolution);
		this.trySet(this.pointCloudEDL, config.pointCloudEDL);
		this.trySet(this.pointCloudEDLStrength, config.pointCloudEDLStrength);
		this.trySet(this.pointCloudEDLRadius, config.pointCloudEDLRadius);
		this.trySet(this.proMode, config.proMode);
		this.trySet(this.globeOpacity, config.globeOpacity);
		this.loadTerrainProvider(config.terrainProviders);
	}

	private trySet<T>(option: Writable<T>, value: T) {
		if (value) {
			option.set(value);
		}
	}

	private subscribe<T>(option: Writable<T>, setFunction: (v: T) => void) {
		option.subscribe((v) => {
			this.change(() => {
				setFunction(v);
			});
		});
	}

	private change(setFunction: () => void) {
		if (!get(this.map.ready)) return;

		setFunction();
		this.map.refresh();
	}

	private loadTerrainProvider(terrainProviderConfig: any): void {
		if(terrainProviderConfig && terrainProviderConfig.length > 0) {
			terrainProviderConfig.forEach((provider: { title: string; url: string;  vertexNormals: boolean }) => {
				this.addTerrainProvider({ title: provider.title, url: provider.url, vertexNormals: provider.vertexNormals ?? true });
			});
		}
	}

	public addTerrainProvider(terrainProvider: { title: string, url: string, vertexNormals: boolean }): void {
		const defaultName = "Default";
		const currentProviders = get(this.terrainProviders);
		for(let i = 0; i < currentProviders.length; i++) {

			// If same url is found remove and add, try using title of newly added provider
			if(currentProviders[i].url === terrainProvider.url) {
				currentProviders[i].title = terrainProvider.title.length !== 0 ? terrainProvider.title : currentProviders[i].title.length !== 0 ? currentProviders[i].title : defaultName;
				//currentProviders.splice(i, 1);
				//currentProviders.push(terrainProvider);
				this.terrainProviders.set(currentProviders);
				return;
			}
		}

		terrainProvider.title = terrainProvider.title.length === 0 ? defaultName : terrainProvider.title;
		currentProviders.push(terrainProvider);
		this.terrainProviders.set(currentProviders);
	}

	public initTerrainProvider(): void {
		const currentProviders = get(this.terrainProviders);
		if(currentProviders.length > 0) {
			this.selectedTerrainProvider.set(currentProviders[0]);	
		}
	}

	private async switchTerrainProvider(terrainProvider: { title: string, url: string, vertexNormals: boolean }): Promise<void> {
		if (terrainProvider && terrainProvider.url) {
			const provider = await Cesium.CesiumTerrainProvider.fromUrl(terrainProvider.url, {
				requestVertexNormals: true
			});
			this.map.viewer.terrainProvider = provider;
		} else {
			// if undefined or no url create empty terrain
			this.map.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
		}
		this.terrainSwitchReady.set(true);
	}

	private switchTileInspector(enable: boolean): void {
		if (enable) {
			this.map.viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);
			const inspectorViewModel = this.map.viewer.cesium3DTilesInspector.viewModel;
		} else {
			if (this.map.viewer.cesium3DTilesInspector) {
				this.map.viewer.cesium3DTilesInspector.destroy();
			}
		}
	}

	private setPointCloudSetting(option: string, value: any): void {
		const layers = Get3dLayers(this.map);
		if (!layers) return;

		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];

			switch (option) {
				case "attenuation":
					layer.setPointCloudAttenuation(value);
					break;
				case "attenuationBaseResolution":
					layer.setPointCloudAttenuationBaseResolution(value);
					break;
				case "attenuationErrorScale":
					layer.setPointCloudAttenuationGeometricErrorScale(value);
					break;
				case "attenuationMaximum":
					layer.setPointCloudAttenuationMaximum(value);
					break;
				case "edl":
					layer.setPointCloudEdl(value);
					break;
				case "edlRadius":
					layer.setPointCloudEdlRadius(value);
					break;
				case "edlStrength":
					layer.setPointCloudEdlStrength(value);
					break;
				default:
					break;
			}

		}
	}

	public setGlobeOpacity(value: number): void {
		var alpha = Math.max(0, value) / 100;

		if (alpha > 0) {
			this.map.viewer.scene.globe.show = true;
			if (alpha >= 1.0) {
				alpha = 1.0;
				this.map.viewer.scene.globe.translucency.enabled = false;
			} else {
				this.map.viewer.scene.globe.translucency.enabled = true;
			}
		} else {
			this.map.viewer.scene.globe.show = false;
		}

		this.map.viewer.scene.globe.translucency.frontFaceAlpha = alpha;
		this.map.refresh();
	}

	public setDateTime(unixTime: number): void {
		const date = new Date(unixTime);
		this.map.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(date.toISOString());
	}
}
