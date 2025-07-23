import { writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { RouteSegment } from "./route-segments";
import type { Map } from "$lib/components/map-cesium/module/map";
import { iconMap, processSVG } from "../../asset-icons";


export interface IMeasureConfig {
	type: string; //"capacity" | "height" | "blockage";
	asset: string;
	name: string;
	description: string;
	routeSegmentFids: Array<string>;
	cost: number;
	value: number;
}


export abstract class Measure {

	public config: IMeasureConfig;
	private map: Map;
	public routeSegments: Array<RouteSegment> = [];
	public applied: Writable<boolean> = writable(false);

	public position: Cesium.Cartesian3 = new Cesium.Cartesian3(0, 0, 0);
	private billboard: Cesium.Entity;
	private polylinePrimitive?: Cesium.GroundPolylinePrimitive;

	get centerCartesian3(): Cesium.Cartesian3 {
		return this.position;
	}

	constructor(config: IMeasureConfig, map: Map) {
		this.config = config;
		this.map = map;
		this.billboard = this.createBillboard();
		this.applied.subscribe((applied) => {
			if (applied) {
				this.routeSegments.forEach((segment) => this.applyTo(segment));
			} else {
				this.routeSegments.forEach((segment) => this.removeFrom(segment));
			}
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

	private createBillboard(): Cesium.Entity {
		const icon = iconMap[this.config.asset];
		const svg = processSVG(icon, "12mm");
		const billboard = new Cesium.Entity({
			id: `measure-${this.config.name}`,
			name: this.config.name,
			position: this.position,
			billboard: {
				image: svg,
				horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1.0, 3.0e6, 0.1)
			},
			show: false
		});
		this.map.viewer.entities.add(billboard);
		return billboard;
	}

	private updateEntities(): void {
		this.updateBillboardPosition();
		this.billboard.show = this.routeSegments.length > 0;
		this.updatePrimitive();
	}

	private updateBillboardPosition(): void {
		if (this.routeSegments.length > 0) {
			const coordinates = this.routeSegments.map((segment) => [segment.lon, segment.lat]);
			const center = coordinates.length === 1 
				? coordinates[0] 
				: turf.center(turf.lineString(coordinates)).geometry.coordinates;
			this.position = Cesium.Cartesian3.fromDegrees(center[0], center[1], 50);
			this.billboard.position = new Cesium.ConstantPositionProperty(this.position);
		}
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
		if (!this.billboard?.billboard) return;
		const color = b ? Cesium.Color.BLUE : Cesium.Color.DARKBLUE;
		this.billboard.billboard.color = new Cesium.ColorMaterialProperty(color);
		if (this.polylinePrimitive && this.polylinePrimitive?.ready) {
			for (const segment of this.routeSegments) {
				const attributes = this.polylinePrimitive.getGeometryInstanceAttributes(`measure-${segment.id}-${this.config.name}}`);
				if (attributes) {
					attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(color, attributes.color);
					attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(b, attributes.show);
				}
			}
		}
	}
}


export class CapacityMeasure extends Measure {

	constructor(config: IMeasureConfig, map: Map) {
		super(config, map);
	}

	public applyTo(routeSegment: RouteSegment): void {
		const newCapacity = routeSegment.capacity + this.config.value;
		routeSegment.updateCapacity(newCapacity);
	}

	public removeFrom(routeSegment: RouteSegment): void {
		const newCapacity = routeSegment.capacity - this.config.value;
		routeSegment.updateCapacity(newCapacity);
	}
}

export class HeightMeasure extends Measure {

	constructor(config: IMeasureConfig, map: Map) {
		super(config, map);
	}

	public applyTo(routeSegment: RouteSegment): void {
		routeSegment.raisedBy += this.config.value;
	}

	public removeFrom(routeSegment: RouteSegment): void {
		routeSegment.raisedBy -= this.config.value;
	}
}

export class BlockageMeasure extends Measure {

	constructor(config: IMeasureConfig, map: Map) {
		super(config, map);
	}

	public applyTo(routeSegment: RouteSegment): void {
	}

	public removeFrom(routeSegment: RouteSegment): void {
	}
}