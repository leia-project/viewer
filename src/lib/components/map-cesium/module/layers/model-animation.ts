import * as Cesium from "cesium";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import type { LayerConfig } from "$lib/components/map-core/layer-config";

import type { Map } from "../map";
import { writable, type Unsubscriber, type Writable, get } from "svelte/store";
import { CesiumLayer } from "./cesium-layer";
import LayerControlModelAnimation from "../../LayerControls/LayerControlModelAnimation.svelte";


interface inputFeature {
	type: 'Feature',
	properties: any,
	geometry: {
		type: "point",
		coordinates: Array<number>
	}
}

export class ModelAnimation extends CesiumLayer<Cesium.CustomDataSource> {

	private modelUrl: string;
	private dataUrl: string;
	private timeKey: string;
	private orientationKey: string;
	private clampToTerrain: boolean;

	private data!: Array<inputFeature>;
	private modelEntity!: Cesium.Entity;

	public startTime: Date = new Date();
	public endTime: Date = new Date(0);

	private wayPointDataSource: Cesium.CustomDataSource = new Cesium.CustomDataSource('waypoints');
	public showWayPoints: Writable<boolean> = writable(false);
	public tracking: Writable<boolean> = writable(false);

	private postRenderCallback!: () => void;
	private unsubscribers: Array<Unsubscriber> = [];

	public loaded: boolean = false;
	private tilesLoaded: boolean = false;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.modelUrl = config.settings.modelUrl ?? "https://storage.googleapis.com/ahp-research/maquette/models/ship_c.glb";
		this.dataUrl = config.settings.url ?? "https://storage.googleapis.com/ahp-research/maquette/circulaire_grondstromen/json/bctn-export-simplified-splitted-2.geojson";
		this.timeKey = config.settings.timeKey;
		this.orientationKey = config.settings.orientationKey;
		this.clampToTerrain = config.settings.clampToTerrain ?? true;
		this.addControl();
		this.addToMap();
	}


	public async addToMap(): Promise<void> {
		if (!this.loaded) await this.loadData(); //First time fetch the data

		this.addModel();
		this.map.viewer.dataSources.add(this.wayPointDataSource);
		this.map.viewer.entities.add(this.modelEntity);

		this.setTimes();

		this.unsubscribers[0] = this.tracking.subscribe((b) => {
			if (b && this.modelEntity) this.map.viewer.trackedEntity = this.modelEntity;
			else this.map.viewer.trackedEntity = undefined;
		});
		this.unsubscribers[1] = this.showWayPoints.subscribe((b) => {
			const wayPoints = this.wayPointDataSource.entities.values;
			for (let i=0; i<wayPoints.length; i++) {
				wayPoints[i].show = b;
			}
			this.map.viewer.scene.requestRender();
		});
		this.unsubscribers[2] = this.map.options.animate.subscribe((b) => {
			if (!b) this.tracking.set(false);
		});	

		const showInit = get(this.visible);
		//showInit ? this.show() : this.hide();

		// Wait for tiles to load before adding the postRender callback
		const tileLoadProgress = () => {
			if (this.map.viewer.scene.globe.tilesLoaded) {
				this.tilesLoaded = true;
				if (showInit) this.visible.set(true); // Run show again to add the postRender callback
				this.map.viewer.scene.globe.tileLoadProgressEvent.removeEventListener(tileLoadProgress);
			}
		}
		this.map.viewer.scene.globe.tileLoadProgressEvent.addEventListener(tileLoadProgress);

		this.map.options.showAnimationWidget.set(true);
	}


	public removeFromMap(): void {
		this.map.viewer.dataSources.remove(this.wayPointDataSource);
		this.map.viewer.entities.remove(this.modelEntity);
		this.tracking.set(false);
		this.loaded = false;
		this.tilesLoaded = false;
		this.unsubscribers.forEach(u => u());
		this.unsubscribers = [];
		this.startTime = new Date();
		this.endTime = new Date(0);
		if (this.postRenderCallback) this.map.viewer.scene.postRender.removeEventListener(this.postRenderCallback);
	}

	public show(): void {
		if (!this.loaded) return;
		this.modelEntity.show = true;
		if (this.tilesLoaded && this.postRenderCallback) this.map.viewer.scene.postRender.addEventListener(this.postRenderCallback);
		else this.visible.set(false);
	}

	public hide(): void {
		if (!this.loaded) return;
		this.showWayPoints.set(false);
		this.modelEntity.show = false;
		this.tracking.set(false);
		if (this.postRenderCallback) this.map.viewer.scene.postRender.removeEventListener(this.postRenderCallback);
	}

	public opacityChanged(opacity: number): void {
	}



	private async loadData(): Promise<void> {
		const data = await fetch(this.dataUrl);
		const json = await data.json();
		this.data = json.features;
		this.loaded = true;
	}


	public async addModel(): Promise<void> {
		if (!this.loaded) return;

	// 1. Make sampled position properties
		const positionSamples = new Cesium.SampledPositionProperty();
		const orientation = new Cesium.SampledProperty(Cesium.Quaternion);
		const wayPointColor = Cesium.Color.DODGERBLUE;

		const mode = "linear"; //or "custom"
		let position1Scratch = Cesium.Cartesian3.fromDegrees(this.data[0].geometry.coordinates[0], this.data[0].geometry.coordinates[1], 10);
		for (let i = 0; i < this.data.length; i++) {
			const feature = this.data[i];
			const time = Cesium.JulianDate.fromDate(new Date(feature.properties[this.timeKey])); // time in seconds from start

			// Add position to SampledPositionProperty and add entity
			positionSamples.addSample(time, position1Scratch);

			const wayPoint = new Cesium.Entity({
				position: position1Scratch,
				point: {
					pixelSize: 1,
					color: Cesium.Color.TRANSPARENT,
					outlineColor: wayPointColor,
					outlineWidth: 3,
					heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				},
				show: false
			});
			this.wayPointDataSource.entities.add(wayPoint);

			// Add orientation to SampledProperty for orientation
			const nextFeature = this.data[i+1];
			if (!nextFeature) break;
			const position2 = Cesium.Cartesian3.fromDegrees(nextFeature.geometry.coordinates[0], nextFeature.geometry.coordinates[1], 10);

			if (this.orientationKey) {
				if (mode === "linear") {
					let directionVector = new Cesium.Cartesian3();
					Cesium.Cartesian3.subtract(position2, position1Scratch, directionVector);
					let quaternion = new Cesium.Quaternion();
					if (!Cesium.Cartesian3.equals(directionVector, Cesium.Cartesian3.ZERO)) {
						Cesium.Cartesian3.normalize(directionVector, directionVector);
						const rotationMatrix = Cesium.Transforms.rotationMatrixFromPositionVelocity(position1Scratch, directionVector);
						Cesium.Quaternion.fromRotationMatrix(rotationMatrix, quaternion);
					}
					orientation.addSample(time, quaternion);
				} else if (mode === "custom") {
					const hprQuaternion = Cesium.Transforms.headingPitchRollQuaternion(position1Scratch, new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(feature.properties.cog - 90), 0, 0));
					orientation.addSample(time, hprQuaternion);
				}
			}

			position1Scratch = position2;
		}
	
	// 2. Add model entity and attach the sampled position properties
		this.modelEntity = new Cesium.Entity({
			position: positionSamples,
			orientation: new Cesium.VelocityOrientationProperty(positionSamples),
			//orientation: this.orientationKey ? orientation : new Cesium.VelocityOrientationProperty(positionSamples),
			model: {
				uri: this.modelUrl,
				scale: 1
			},
			show: true
		});

	
	// 3. Add postRender callback to clamp to terrain
		if (this.clampToTerrain) {
			this.postRenderCallback = () => {
				let position = positionSamples.getValue(this.map.viewer.clock.currentTime);
				if (position) {
					let clamped = this.map.viewer.scene.clampToHeight(position, [this.modelEntity]);
					if (clamped) this.modelEntity.position = new Cesium.ConstantPositionProperty(clamped);
				}
			}
		}
	}


	private setTimes(): void {
		this.startTime = new Date(this.data[0].properties[this.timeKey]);
		this.endTime = new Date(this.data[this.data.length - 1].properties[this.timeKey]);
	}

	public setTimeToStart(): void {
		this.map.viewer.clock.currentTime = Cesium.JulianDate.fromDate(this.startTime);
	}

	public zoomToModel(): void {
		if (!this.modelEntity) return;
		const mapTime = Cesium.JulianDate.toDate(this.map.viewer.clock.currentTime);
		if (mapTime < this.startTime || mapTime > this.endTime) this.setTimeToStart(); // If time is outside of model time samples, the model is not visible 
		this.map.viewer.zoomTo(this.modelEntity);
	}

	private addControl(): void {
		const modelAnimationControl = new CustomLayerControl();
		modelAnimationControl.component = LayerControlModelAnimation;
		modelAnimationControl.props = {
			layer: this
		};
		this.addCustomControl(modelAnimationControl);
	}
}