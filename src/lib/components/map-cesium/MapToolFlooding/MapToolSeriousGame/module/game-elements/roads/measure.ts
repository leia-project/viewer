import { writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { RouteSegment } from "./route-segments";
import type { Map } from "$lib/components/map-cesium/module/map";


export interface IMeasureConfig {
	type: "capacity" | "height";
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

	public hasRouteSegment(id: string): boolean {
		return this.routeSegments.some((segment) => segment.id === id);
	}

	public abstract applyTo(routeSegment: RouteSegment): void;

	public abstract removeFrom(routeSegment: RouteSegment): void;

	private createBillboard(): Cesium.Entity {
		const billboard = new Cesium.Entity({
			name: this.config.name,
			description: this.config.description,
			billboard: {
				image: "https://companieslogo.com/img/orig/SWEC-A.ST.D-85947743.png?t=1720244494",
				color: Cesium.Color.RED,
				scale: 0.5,
				horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM
			},
			position: Cesium.Cartesian3.fromDegrees(0, 0)
		});
		this.map.viewer.entities.add(billboard);
		return billboard;
	}

	private updateEntities(): void {
		this.updateBillboardPosition();
		this.updateLine();
	}

	private updateBillboardPosition(): void {
		if (this.routeSegments.length > 0) {
			const coordinates = this.routeSegments.map((segment) => [segment.lon, segment.lat]);
			const center = turf.center(turf.lineString(coordinates));
			const centerC3 = Cesium.Cartesian3.fromDegrees(center.geometry.coordinates[0], center.geometry.coordinates[1]);
			this.billboard.position = new Cesium.ConstantPositionProperty(centerC3);
		}
	}

	private updateLine(): void {
		this.lines.entities.removeAll();
		const lines = this.routeSegments.map((segment) => segment.lineEntity.entity);
		const copies: Array<Cesium.Entity> = lines.map((line) => Cesium.clone(line, true));
		copies.forEach((line) => {
			this.lines.entities.add(line);
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