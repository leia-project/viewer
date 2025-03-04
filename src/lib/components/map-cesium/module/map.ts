import * as Cesium from "cesium";
import FlyCamera from "./fly-camera.js";

import { FeatureInfoHandler } from "./feature-info-handler";
import { get } from "svelte/store";
import { MapCore } from "$lib/components/map-core/map-core";
import { LayerConfig } from "$lib/components/map-core/layer-config";
import { FeatureInfoRequestOptions } from "$lib/components/map-core/FeatureInfo/feature-info-request-options";
import { Location } from "$lib/components/map-core/location";
import { MouseLocation } from "$lib/components/map-core/mouse-location";
import { CameraLocation } from "$lib/components/map-core/camera-location";
import { Layer } from "$lib/components/map-core/layer";
import { FeatureInfo } from "$lib/components/map-core/FeatureInfo/feature-info";

import { CesiumLayerFactory } from "./cesium-layer-factory.js";
import { MapOptions } from "./map-options.js";

import type { CesiumLayer } from "./layers/cesium-layer.js";


export class Map extends MapCore {
	public viewer!: Cesium.Viewer;
	public camera!: Cesium.Camera;
	public options: MapOptions;
	public featureInfoHandler!: FeatureInfoHandler;

	public flyCamera: FlyCamera | undefined; // Do not remove
	private layerFactory: CesiumLayerFactory;

	constructor(reload: boolean = false) {
		super();

		this.options = new MapOptions(this);
		this.layerFactory = new CesiumLayerFactory();
		this.configLoaded.subscribe((loaded) => {
			this.handleConfig(loaded);
		});
		if (reload) {
			setTimeout(() => {this.dispatch('reload', reload)}, 0) ;
		}
	}

	private handleConfig(loaded: boolean) {
		if (!loaded) {
			return;
		}
		
		const cesiumSettings = this.toolSettings.find((t) => t.id === "cesium");
		if (cesiumSettings) {
			this.options.loadFromConfig(cesiumSettings.settings);
		}

		if (this.viewerSettings.terrain) {
			this.addTerrainProvider(this.viewerSettings.terrain);
		}

		this.options.initTerrainProvider()
		this.home();
	}

	protected async queryFeatureInfo(options: FeatureInfoRequestOptions): Promise<FeatureInfo[]> {
		return await this.featureInfoHandler.queryFeatureInfo(options);
	}

	public addLayer(config: LayerConfig): Layer {
		const layer = this.layerFactory.convert(this, config);
		if(!layer) {
			throw Error(`Error: Unable to add layer ${config.title}`);
		}

		return layer;
	}

	public removeLayer(layer: CesiumLayer<unknown>): void {
		layer.removeFromMap();
		this.refresh();
	}

	public initialize(container: HTMLElement, addDefaultBaselayer = false): void {
		this.container = container;
		this.viewer = this.createViewer(container, addDefaultBaselayer);
		this.camera = this.viewer.camera;
		this.viewer.forceResize();

		this.addFlyCamera();
		this.featureInfoHandler = new FeatureInfoHandler(this);

		if (!this.startPosition) {
			this.startPosition = new CameraLocation(
				6.599192,
				53.298561,
				412.5886013073694,
				329,
				-29.189434822434666,
				0
			);
		}

		setTimeout(() => {
			this.setReady();
		}, 1000);
	}

	public resetNorth(): void {
		const pos = this.getPosition();
		pos.heading = 0;

		this.flyTo(pos);
	}

	public zoomIn(): void {
		this.viewer?.scene.camera.zoomIn(this.getCameraZoomChange());
		this.refresh();
	}

	public zoomOut(): void {
		this.viewer?.scene.camera.zoomOut(this.getCameraZoomChange());
		this.refresh();
	}

	public flyTo(position: CameraLocation): Promise<void> {
		return new Promise((resolve, reject) => {
			this.camera?.flyTo({
				destination: Cesium.Cartesian3.fromDegrees(position.x, position.y, position.z),
				orientation: {
					heading: Cesium.Math.toRadians(position.heading),
					pitch: Cesium.Math.toRadians(position.pitch),
					roll: 0.0
				},
				duration: position.duration,
				complete: resolve,
				cancel: reject
			});
		});
	}

	public getPosition(): CameraLocation {
		const camPosition = Cesium.Cartographic.fromCartesian(this.camera.position);
		const camHeading = this.camera.heading * Cesium.Math.DEGREES_PER_RADIAN;
		const camPitch = this.camera.pitch * Cesium.Math.DEGREES_PER_RADIAN;

		const position = new CameraLocation(
			(camPosition.longitude / Math.PI) * 180,
			(camPosition.latitude / Math.PI) * 180,
			camPosition.height,
			camHeading,
			camPitch,
			1.5
		);
		return position;
	}

	getContainer(): HTMLElement {
		return this.container;
	}

	public lookAt(targetPosition: Cesium.Cartesian3): void {
		var cameraPosition = this.camera.position.clone();
		var direction = Cesium.Cartesian3.subtract(
			targetPosition,
			cameraPosition,
			new Cesium.Cartesian3()
		);
		direction = Cesium.Cartesian3.normalize(direction, direction);
		this.camera.direction = direction;

		// get an "approximate" up vector, which in this case we want to be something like the geodetic surface normal.
		var approxUp = Cesium.Cartesian3.normalize(
			cameraPosition,
			new Cesium.Cartesian3()
		);

		// cross viewdir with approxUp to get a right normal
		var right = Cesium.Cartesian3.cross(
			direction,
			approxUp,
			new Cesium.Cartesian3()
		);
		right = Cesium.Cartesian3.normalize(right, right);
		this.camera.right = right;

		// cross right with view dir to get an orthonormal up
		var up = Cesium.Cartesian3.cross(
			right,
			direction,
			new Cesium.Cartesian3()
		);
		up = Cesium.Cartesian3.normalize(up, up);
		this.camera.up = up;
	}

	/*
	* When loading an old config the terrain provider is set to map config and not cesium
	* support old config by passing terrain provider to options.
	*/
	private async addTerrainProvider(settings: any): Promise<void> {
		if (!settings["url"]) {
			return;
		}

		const url = settings["url"];
		const requestVertexNormals = settings["requestVertexNormals"] !== undefined ? settings["requestVertexNormals"] : true;

		this.options.addTerrainProvider({ title: "", url: url, vertexNormals: requestVertexNormals })
	}

	private createViewer(container: HTMLElement, addDefaultBaselayer: boolean): Cesium.Viewer {
		// @ts-ignore
		Cesium.Ion.defaultAccessToken = undefined;

		const viewer = new Cesium.Viewer(container, {
			requestRenderMode: true,
			timeline: false,
			animation: false,
			baseLayerPicker: false,
			homeButton: false,
			navigationHelpButton: false,
			vrButton: false,
			fullscreenButton: false,
			sceneModePicker: false,
			geocoder: false,
			// @ts-ignore
			imageryProvider: false, //https://community.cesium.com/t/invalid-access-token-when-not-using-ion/7563/5
			infoBox: false,
			msaaSamples: 1,
			
		});

		if (addDefaultBaselayer) {
			this.addLayer(this.getDefaultLayerConfig());
		}

		viewer.clock.shouldAnimate = get(this.options.animate);
		viewer.scene.debugShowFramesPerSecond = get(this.options.fpsCounter);

		if (addDefaultBaselayer === false) {
			viewer.imageryLayers.removeAll();
		}

		// shadow settings
		viewer.shadows = get(this.options.shadows);
		viewer.terrainShadows = Cesium.ShadowMode.ENABLED;
		viewer.shadowMap.maximumDistance = 1200;
		viewer.shadowMap.fadingEnabled = false;
		viewer.shadowMap.darkness = 0.65; // higher is less dark

		// resolution settings
		viewer.resolutionScale = get(this.options.resolutionScale);
		viewer.useBrowserRecommendedResolution = false;

		// sky, rendering settings
		viewer.scene.globe.baseColor = Cesium.Color.WHITE;
		viewer.scene.skyAtmosphere.show = get(this.options.skyAtmosphere);
		viewer.scene.fog.enabled = get(this.options.fog);
		//viewer.scene.fog.density = 0.005;

		viewer.scene.highDynamicRange = get(this.options.highDynamicRange);
		viewer.scene.postProcessStages.fxaa.enabled = get(this.options.fxaa);

		// Enable going subsurface
		viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

		// Set sun position
		const date = new Date();
		date.setUTCFullYear(2022, 7, 10);
		date.setUTCHours(13, 0, 0, 0);
		viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);

		viewer.scene.globe.maximumScreenSpaceError = get(this.options.maximumScreenSpaceError);
		viewer.scene.globe.enableLighting = get(this.options.lighting);
		viewer.scene.globe.showGroundAtmosphere = get(this.options.groundAtmosphere);
		viewer.scene.globe.depthTestAgainstTerrain = true;
		viewer.scene.globe.translucency.enabled = true;

		//viewer.clock.onTick.addEventListener((clock) => this._update(clock));
		//viewer.scene.globe.terrainExaggeration = 50;
		//this._addSilhouette(viewer)

		//viewer.scene.globe.translucency.frontFaceAlphaByDistance.nearValue = 0.5;
		//viewer.scene.globe.translucency.frontFaceAlphaByDistance.farValue = 0.5;

		return viewer;
	}

	private getDefaultLayerConfig(): LayerConfig {
		const config = new LayerConfig({id: "default_layer", title: "Luchtfoto 2021", defaultOn: true, defaultAddToManager: true});
		config.isBackground = true;
		config.settings = {
			url: "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0?request=GetCapabilities&service=wmts",
			featureName: "2021_orthoHR",
			contentType: "image/png"
		};

		return config;
	}

	private addFlyCamera(): void {
		this.flyCamera = new FlyCamera(this.viewer);
	}

	public refresh(): void {
		if (this.viewer) this.viewer.scene.requestRender()
	}

	private getCameraZoomChange() {
		const cameraPosition = this.viewer.scene.camera.positionWC;
		const ellipsoidPosition =
			this.viewer.scene.globe.ellipsoid.scaleToGeodeticSurface(cameraPosition);
		const distance = Cesium.Cartesian3.magnitude(
			Cesium.Cartesian3.subtract(cameraPosition, ellipsoidPosition, new Cesium.Cartesian3())
		);
		return distance / 2;
	}

	screenToLonLat(location: MouseLocation): Location {
		var ray = this.viewer.camera.getPickRay(new Cesium.Cartesian2(location.x, location.y));
		if (!ray) {
			throw new Error("Unable to raycast to mouse position");
		}

		var position = this.viewer.scene.globe.pick(ray, this.viewer.scene);
		if (position) {
			var cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
			return new Location(Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude), cartographic.height);
		}

		throw new Error("Unable to get location from map");
	}

	protected subscribeMouseMove(trigger: (m: MouseLocation) => void): void {
		this.viewer?.cesiumWidget.screenSpaceEventHandler.setInputAction((e: any) => {
			trigger(new MouseLocation(e.endPosition.x, e.endPosition.y));
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}

	protected subscribeMouseLeftClick(trigger: (m: MouseLocation) => void): void {
		this.viewer?.cesiumWidget.screenSpaceEventHandler.setInputAction((e: any) => {
			trigger(new MouseLocation(e.position.x, e.position.y));
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	}

	protected subscribeMouseRightClick(trigger: (m: MouseLocation) => void): void {
		this.viewer?.cesiumWidget.screenSpaceEventHandler.setInputAction((e: any) => {
			trigger(new MouseLocation(e.position.x, e.position.y));
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
	}
}
