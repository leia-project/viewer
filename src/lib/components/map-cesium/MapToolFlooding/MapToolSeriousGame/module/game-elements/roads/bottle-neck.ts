import type { Map } from "$lib/components/map-cesium/module/map";
import { getCartesian2 } from "$lib/components/map-cesium/module/utils/geo-utils";
import { CameraLocation } from "$lib/components/map-core/camera-location";
import * as Cesium from "cesium";
import { get, writable, type Writable } from "svelte/store";


abstract class RoutingNode {

	public id: string;
	public lon: number;
	public lat: number;
	public position: Cesium.Cartesian3;
	public entity: Cesium.Entity;

	constructor(id: string, lon: number, lat: number) {
		this.id = id;
		this.lon = lon;
		this.lat = lat;
		this.position = Cesium.Cartesian3.fromDegrees(lon, lat);
		this.entity = this.createEntity();
	}

	protected abstract createEntity(): Cesium.Entity;
}


export class ExtractionPoint extends RoutingNode {

	public totalExtracted: number = 0;

	constructor(id: string, lon: number, lat: number) {
		super(id, lon, lat);
	}

	protected createEntity(): Cesium.Entity {
		return new Cesium.Entity({
			id: this.id,
			position: this.position,
			billboard: {
				image: "/images/leia_logo.png",
				scale: 0.2,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		});
	}
}



export interface IMeasure {
	name: string;
	impact: any;
}


export class BottleNeck extends RoutingNode {

	public measures: Array<IMeasure> = [];
	public capacity: number; // Extraction capacity per time step
	public currentLoad: number = 0;

	constructor(id: string, lon: number, lat: number, capacity: number) {
		super(id, lon, lat);
		this.capacity = capacity;
	}

	protected createEntity(): Cesium.Entity {
		return new Cesium.Entity({
			id: this.id,
			position: this.position,
			billboard: {
				image: "/images/Geodan_logo.png",
				scale: 0.12,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		});
	}

}



export class RoadNetworkLayer<T extends RoutingNode> {

	private map: Map;
	private dataSource: Cesium.CustomDataSource;
	private items: Array<T> = [];

	//private infobox: InfoBox | undefined;
	private hovered: Writable<T | undefined> = writable(undefined);

	public infoboxTimeOut: NodeJS.Timeout  | undefined;

	constructor(map: Map) {
		this.map = map;
		this.dataSource = new Cesium.CustomDataSource();
		this.map.viewer.dataSources.add(this.dataSource);
	}

	public add(bottleneck: T): void {
		this.dataSource.entities.add(bottleneck.entity);
		this.items.push(bottleneck);
	}

	public remove(bottleneck: T): void {
		this.dataSource.entities.remove(bottleneck.entity);
		this.items = this.items.filter((item) => item.id !== bottleneck.id);
	}

	public clear(): void {
		this.map.viewer.dataSources.remove(this.dataSource);
	}
}
