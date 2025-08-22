import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { RouteSegment } from "./route-segments";
import type { Map } from "$lib/components/map-cesium/module/map";
import { iconMap, processSVG } from "../../asset-icons";


export interface IMeasureConfig {
	id: string;
	type: string; //"widen" | "raise" | "block";
	asset: string;
	name: string;
	description: string;
	routeSegmentFids: Array<string>;
	cost: number;
	value: number;
}


export abstract class Measure {

	private static constantTrue = new Cesium.ConstantProperty(true);
	private static constantFalse = new Cesium.ConstantProperty(false);

	public config: IMeasureConfig;
	private map: Map;
	public routeSegments: Array<RouteSegment> = [];
	public applied: Writable<boolean> = writable(false);

	public position: Cesium.Cartesian3 = new Cesium.Cartesian3(0, 0, 0);
	private billboard: Cesium.Entity;
	private billboardApplied: Cesium.Entity;
	private polylinePrimitive?: Cesium.GroundPolylinePrimitive;

	get centerCartesian3(): Cesium.Cartesian3 {
		return this.position;
	}

	public show: Writable<boolean> = writable(true);
	public toggleEnabled: Writable<boolean> = writable(true);
	private applyUnsubscriber?: () => void;

	constructor(config: IMeasureConfig, map: Map) {
		this.config = config;
		this.map = map;
		this.billboard = this.createBillboard("#F4F6F8", "default");
		this.billboardApplied = this.createBillboard("#00BFFF", "applied"); // #AFEEEE
		this.toggleEnabled.subscribe((enabled) => {
			enabled ? this.subscribeApply() : this.applyUnsubscriber?.();
			this.updateBillboard(enabled);
		});
		this.show.subscribe((show) => {
			this.billboard.show = show;
			this.billboardApplied.show = show;
			if (this.polylinePrimitive) {
				this.polylinePrimitive.show = show;
			}
			this.map.refresh();
		});
	}

	// Use this function to toggle enabled state of the measure
	public abstract inPreparationPhase(inPreparation: boolean): void;

	private subscribeApply(): void {
		this.applyUnsubscriber = this.applied.subscribe((applied) => {
			if (applied) {
				this.routeSegments.forEach((segment) => this.applyTo(segment));
			} else {
				this.routeSegments.forEach((segment) => this.removeFrom(segment));
			}
			if (this.billboard.billboard) this.billboard.billboard.show = applied ? Measure.constantFalse : Measure.constantTrue;
			if (this.billboardApplied.billboard) this.billboardApplied.billboard.show = applied ? Measure.constantTrue : Measure.constantFalse;
			this.map.refresh();
		});
	}

	public addRouteSegment(routeSegment: RouteSegment): void {
		this.routeSegments.push(routeSegment);
		this.updateEntities();
	}

	public removeRouteSegment(routeSegment: RouteSegment): void {
		const index = this.routeSegments.indexOf(routeSegment);
		if (index > -1) {
			this.routeSegments.splice(index, 1);
			this.updateEntities();
		}
	}

	public empty(): void {
		if (this.routeSegments.length > 0) {
			this.routeSegments = [];
			this.updateEntities();
		}
	}

	public hasRouteSegment(id: string): boolean {
		return this.routeSegments.some((segment) => segment.id === id);
	}

	public abstract applyTo(routeSegment: RouteSegment): void;

	public abstract removeFrom(routeSegment: RouteSegment): void;

	private createBillboard(bgColor: string, type: string): Cesium.Entity {
		const icon = iconMap[this.config.asset];
		const svg = processSVG(icon, "12mm", bgColor);
		const billboard = new Cesium.Entity({
			id: `measure_${type}-${this.config.name}`,
			name: this.config.name,
			position: this.position,
			billboard: {
				image: svg,
				horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1.0, 3.0e6, 0.1)
			},
			show: get(this.show)
		});
		this.map.viewer.entities.add(billboard);
		return billboard;
	}

	private updateBillboard(enabled: boolean): void {
		if (this.map.viewer.entities.contains(this.billboard)) {
			this.map.viewer.entities.remove(this.billboard);
		}
		this.billboard = this.createBillboard(enabled ? "#F4F6F8" : "#787878", "default");
		if (this.map.viewer.entities.contains(this.billboardApplied)) {
			this.map.viewer.entities.remove(this.billboardApplied);
		}
		this.billboardApplied = this.createBillboard(enabled ? "#00BFFF" : "#306e82ff", "applied");
	}

	private updateEntities(): void {
		this.updateBillboardPosition();
		this.billboard.show = this.routeSegments.length > 0 && get(this.show);
		this.billboardApplied.show = this.routeSegments.length > 0 && get(this.show);
		this.updatePrimitive();
	}

	private updateBillboardPosition(): void {
		if (this.routeSegments.length > 0) {
			const coordinates = this.routeSegments.map((segment) => [segment.lon, segment.lat]) as Array<[lon: number, lat: number]>;
			const center = coordinates.length === 1 
				? coordinates[0] 
				: this.getMostCentralCoordinate(coordinates);
			this.position = Cesium.Cartesian3.fromDegrees(center[0], center[1], 50);
			this.billboard.position = new Cesium.ConstantPositionProperty(this.position);
			this.billboardApplied.position = new Cesium.ConstantPositionProperty(this.position);
		}
	}

	private getMostCentralCoordinate(coordinates: Array<[lon: number, lat: number]>): [lon: number, lat: number] {
		if (coordinates.length === 1) return coordinates[0];
		let minSum = Infinity;
		let minCoord: [lon: number, lat: number] = coordinates[0];
		for (let i = 0; i < coordinates.length; i++) {
			let sum = 0;
			for (let j = 0; j < coordinates.length; j++) {
				if (i !== j) {
					const dx = coordinates[i][0] - coordinates[j][0];
					const dy = coordinates[i][1] - coordinates[j][1];
					sum += Math.sqrt(dx * dx + dy * dy);
				}
			}
			if (sum < minSum) {
				minSum = sum;
				minCoord = coordinates[i];
			}
		}
		return minCoord;
	}

	private updatePrimitive(): void {
		if (this.polylinePrimitive) {
			this.map.viewer.scene.primitives.remove(this.polylinePrimitive);
		}
		const lineColor = Cesium.Color.BLUE.withAlpha(0.5);
		if (this.routeSegments.length > 0) {
			const geometryInstances = this.routeSegments.map((segment) => segment.lineInstance.createGeometryInstance(`measure-${segment.id}-${this.config.name}}`, lineColor, 24));
			this.polylinePrimitive = new Cesium.GroundPolylinePrimitive({
				geometryInstances: geometryInstances,
				appearance: new Cesium.PolylineColorAppearance({
					translucent: false
				}),
				allowPicking: true,
				asynchronous: false
			});
			this.map.viewer.scene.primitives.add(this.polylinePrimitive);
		}
	}

	public highlight(b: boolean): void {
		if (this.polylinePrimitive && this.polylinePrimitive?.ready) {
			for (const segment of this.routeSegments) {
				const attributes = this.polylinePrimitive.getGeometryInstanceAttributes(`measure-${segment.id}-${this.config.name}}`);
				if (attributes) {
					const color = b ? Cesium.Color.DEEPSKYBLUE : Cesium.Color.RED;
					attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(color, attributes.color);
					attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(b, attributes.show);
				}
			}
		}
	}

	public toggle(show: boolean): void {
		this.billboard.show = show;
		this.billboardApplied.show = show;
		if (this.polylinePrimitive) {
			this.polylinePrimitive.show = show;
		}
		this.map.refresh();
	}

	public flyTo(): void {
		const target = get(this.applied) ? this.billboardApplied : this.billboard;
		this.map.viewer.flyTo(target, {
			offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 1500),
			duration: 1.5
		});
	}
}


export class WidenMeasure extends Measure {

	constructor(config: IMeasureConfig, map: Map) {
		super(config, map);
	}

	public applyTo(routeSegment: RouteSegment): void {
		const newCapacity = routeSegment.capacity * this.config.value;
		routeSegment.updateCapacity(newCapacity);
	}

	public removeFrom(routeSegment: RouteSegment): void {
		const newCapacity = routeSegment.capacity / this.config.value;
		routeSegment.updateCapacity(newCapacity);
	}

	public inPreparationPhase(inPreparation: boolean): void {
		this.toggleEnabled.set(inPreparation);
	}
}

export class RaiseMeasure extends Measure {

	constructor(config: IMeasureConfig, map: Map) {
		super(config, map);
	}

	public applyTo(routeSegment: RouteSegment): void {
		routeSegment.raisedBy += this.config.value;
	}

	public removeFrom(routeSegment: RouteSegment): void {
		routeSegment.raisedBy -= this.config.value;
	}

	public inPreparationPhase(inPreparation: boolean): void {
		this.toggleEnabled.set(inPreparation);
	}
}

export class BlockMeasure extends Measure {

	constructor(config: IMeasureConfig, map: Map) {
		super(config, map);
	}

	public applyTo(routeSegment: RouteSegment): void {
	}

	public removeFrom(routeSegment: RouteSegment): void {
	}

	public inPreparationPhase(inPreparation: boolean): void {
		this.toggleEnabled.set(!inPreparation);
		this.show.set(!inPreparation);
	}
}