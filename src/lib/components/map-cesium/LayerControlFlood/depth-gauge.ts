import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "../module/map";
import { MapMeasurementFloodDepth } from "./map-measurement-flood-depth";


export class DepthGauge {

	private map: Map;
	private measurements: Array<MapMeasurementFloodDepth> = [];
	private measurementId: number;
	private movingPoint: Cesium.Entity | undefined;
	private previouseAnimateState: boolean = false;

	private leftClickHandle = (m: any) => {
		this.createFloodMeasurement(this.getCartesian2(m));
	}

	private moveHandle = (m: any) => {
		const picked = this.map.viewer.scene.pick(m);
		if (picked?.primitive?.type === "flood") {
			this.drawPointMove(this.getCartesian2(m));
		} else if (this.movingPoint != undefined) {
			this.removeMovingPoint();
		}
	}

	constructor(map: Map) {
		this.map = map;
		this.measurementId = 0;
	}

	private getCartesian2(m: any): Cesium.Cartesian2 {
		return new Cesium.Cartesian2(m.x, m.y);
	}

	private removeMovingPoint(): void {
		if (!this.movingPoint) return;
		this.map.viewer.entities.remove(this.movingPoint);
		this.movingPoint = undefined;
	}

	private addMovingPoint(position: Cesium.Cartesian3): void {
		this.movingPoint = this.map.viewer.entities.add({
			position: position,
			point: {
				show: true,
				color: Cesium.Color.BLUE,
				pixelSize: 10,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 1
			}
		});
	}

	private drawPointMove(location: Cesium.Cartesian2): void {
		const picked = this.map.viewer.scene.pickPosition(location);
		if (!this.movingPoint) this.addMovingPoint(picked);
		if (this.movingPoint) this.movingPoint.position = new Cesium.ConstantPositionProperty(picked);
	}

	private createFloodMeasurement(location: Cesium.Cartesian2): void {
		const picked = this.map.viewer.scene.pickPosition(location);
		const measurement = this.addMeasurement();
		measurement.addPoint(picked);

		// Add point on terrain
		let pickedCartographic = Cesium.Cartographic.fromCartesian(picked);
		Cesium.sampleTerrainMostDetailed(this.map.viewer.terrainProvider, [pickedCartographic]).then((result) => {
			measurement.addPoint(Cesium.Cartographic.toCartesian(result[0]));
		});
	}

	private addMeasurement(): MapMeasurementFloodDepth {
		const newMeasurement = new MapMeasurementFloodDepth(this.measurementId, this.map);
		this.measurements.push(newMeasurement);
		this.measurementId++;
		return newMeasurement;
	}

	public activate(): void {
		this.map.on("mouseLeftClick", this.leftClickHandle);
		this.map.on("mouseMove", this.moveHandle);
		this.previouseAnimateState = get(this.map.options.animate);
		this.map.options.animate.set(true);
	}

	public deactivate() {
		this.map.off("mouseLeftClick", this.leftClickHandle);
		this.map.off("mouseMove", this.moveHandle);
		// remove all measurements
		this.measurements.forEach((measurement) => {
			measurement?.remove();
		});
		this.measurementId = 0;
		this.removeMovingPoint();
		this.map.options.animate.set(this.previouseAnimateState);

		this.map.refresh();
	}
	
}