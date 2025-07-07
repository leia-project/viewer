import { writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { RouteSegment } from "./route-segments";
import type { Map } from "$lib/components/map-cesium/module/map";


export interface IMeasureConfig {
	type: string; //"capacity" | "height" | "blockage";
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
	private lines: Cesium.CustomDataSource = new Cesium.CustomDataSource();

	constructor(config: IMeasureConfig, map: Map) {
		this.config = config;
		this.map = map;
		this.map.viewer.dataSources.add(this.lines);
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
		const billboard = new Cesium.Entity({
			id: `measure-${this.config.name}`,
			name: this.config.name,
			billboard: {
				image: "https://companieslogo.com/img/orig/SWEC-A.ST.D-85947743.png?t=1720244494",
				color: Cesium.Color.BLUE,
				height: 64,
				width: 64,
				horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM
			},
			position: this.position,
			show: false
		});
		this.map.viewer.entities.add(billboard);
		return billboard;
	}

	private updateEntities(): void {
		this.updateBillboardPosition();
		this.billboard.show = this.routeSegments.length > 0;
		this.updateLine();
	}

	private updateBillboardPosition(): void {
		if (this.routeSegments.length > 0) {
			const coordinates = this.routeSegments.map((segment) => [segment.lon, segment.lat]);
			const center = coordinates.length === 1 
				? coordinates[0] 
				: turf.center(turf.lineString(coordinates)).geometry.coordinates;
			this.position = Cesium.Cartesian3.fromDegrees(center[0], center[1]);
			this.billboard.position = new Cesium.ConstantPositionProperty(this.position);
		}
	}

	private updateLine(): void {
		this.lines.entities.removeAll();
		this.routeSegments.forEach((line) => {
			const entity = new Cesium.Entity({
				id: `measure-${line.id}-${this.config.name}}`,
				name: this.config.name,
				polyline: {
					positions: line.lineEntity.positions,
					width: 15,
					material: Cesium.Color.BLUE.withAlpha(0.5),
					clampToGround: true,
					zIndex: 2,
				},
				show: false
			});
			this.lines.entities.add(entity);
		});
	}

	public isPicked(picked: any): boolean {
		if (!picked || !this.billboard) return false;
		if (picked && picked.id === this.billboard.id) {
			return true;
		}
		return this.lines.entities.values.some((line) => line.id === picked?.id);
	}

	public highlight(b: boolean): void {
		if (!this.billboard?.billboard) return;
		this.lines.entities.values.forEach((line) => line.show = b);
		const color = b ? Cesium.Color.BLUE : Cesium.Color.DARKBLUE;
		this.billboard.billboard.color = new Cesium.ColorMaterialProperty(color);
		this.lines.entities.values.forEach((line) => {
			if (line.polyline) line.polyline.material = new Cesium.ColorMaterialProperty(color.withAlpha(0.8));
		});
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