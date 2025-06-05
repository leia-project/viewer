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
			},
			
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

	private addEventsListeners(): void {

	}

	private getObjectFromMouseLocation(m: any): T | undefined {
		const location = getCartesian2(m);
		if (!location) return undefined;
		const picked = this.map.viewer.scene.pick(location);
		
		if (picked?.id?.billboard !== undefined) {
			const billboard = picked.id.billboard as Cesium.BillboardGraphics;
			for (const item of this.items) {
				if (billboard === item.entity.billboard) {
					return item;
				}
			}
		}
		return undefined;
	}

	private moveHandle = (m: any) => {
		const obj = this.getObjectFromMouseLocation(m);
		if (obj) clearTimeout(this.infoboxTimeOut);
		if (obj !== get(this.hovered)) this.hovered.set(obj);
		this.map.container.style.cursor = obj ? "pointer" : "default";
	}

	private leftClickHandle = (m: any) => {
		const obj = this.getObjectFromMouseLocation(m);
		// show capacity?
		
		/* const active = get(this.active);
		const loc = get(obj.pointLocation);
		const cameraLocation = new CameraLocation(loc[0], loc[1] - 0.008, 500 + heightOffset, 0, -30, 1.5);
		this.map.flyTo(cameraLocation); */
	}

	private addMouseEvents(): void {
		this.map.on("mouseLeftClick", this.leftClickHandle);
		this.map.on("mouseMove", this.moveHandle);
	}
	private removeMouseEvents(): void {
		this.map.off("mouseLeftClick", this.leftClickHandle);
		this.map.off("mouseMove", this.moveHandle);
	}

}
