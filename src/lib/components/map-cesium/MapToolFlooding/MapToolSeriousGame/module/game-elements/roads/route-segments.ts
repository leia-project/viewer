import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map as CesiumMap } from "$lib/components/map-cesium/module/map";
import { RoutingNode, type IEdgeFeature, type IMeasure } from "./extraction-points";
import type { RouteFeature } from "../api/routing-api";



export class RouteSegment extends RoutingNode<IEdgeFeature> {

	public measures: Array<IMeasure> = [];
	public capacity: number; // Extraction capacity per time step
	public loadPerTimeStep: Map<number, number> = new Map(); // Load per time step
	public dataSource: Cesium.CustomDataSource;
	private elapsedTime: Writable<number> = writable(0);

	public isOverloaded: Writable<boolean> = writable(false);

	constructor(feature: IEdgeFeature, elapsedTime: Writable<number>, dataSource: Cesium.CustomDataSource) {
		const lon = feature.geometry.coordinates[0][0];
		const lat = feature.geometry.coordinates[0][1];
		super(feature.properties.fid.toString(), lon, lat, feature);
		this.capacity = feature.properties.capaciteit;
		this.elapsedTime = elapsedTime;
		this.dataSource = dataSource;
		elapsedTime.subscribe((t) => this.timeUpdated(t));
	}

	protected createEntity(): Cesium.Entity {
		const cartesians = this.feature.geometry.coordinates.map((coord) => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));
		return new Cesium.Entity({
			id: this.id,
			polyline: {
				positions: cartesians,
				width: 15,
				material: Cesium.Color.ORANGE.withAlpha(0.5),
				clampToGround: true
			}
		});
	}

	public addLoad(load: number, time: number = get(this.elapsedTime)): void {
		if (this.loadPerTimeStep.has(time)) {
			this.loadPerTimeStep.set(time, this.loadPerTimeStep.get(time)! + load);
		} else {
			this.loadPerTimeStep.set(time, load);
		}
		this.isOverloaded.set(this.overloaded(time));
		this.updateVisualization();
		/*
		const newLoad = this.currentLoad + load;
		gsap.to(this, {
			currentLoad: newLoad,
			duration: 0.7,
			//onUpdate: () => this.updateAttributes()
		});
		*/
	}

	private timeUpdated(time: number): void {
		this.isOverloaded.set(this.overloaded(time));
		this.updateVisualization();
	}

	public overloaded(time: number = get(this.elapsedTime)): boolean {
		return (this.loadPerTimeStep.get(time) || 0) > this.capacity;
	}

	private updateVisualization(): void {
		const currentLoad = this.loadPerTimeStep.get(get(this.elapsedTime)) || 0;
		if (currentLoad) {
			if (!this.dataSource.entities.contains(this.entity)) this.dataSource.entities.add(this.entity);
			const color = this.getColor(currentLoad);
			if (this.entity.polyline?.material) this.entity.polyline.material = new Cesium.ColorMaterialProperty(color);
		} else {
			this.dataSource.entities.removeById(this.id);
		}
	}

	private getColor(load: number): Cesium.Color {
		const loadRatio = load / this.capacity;
		if (loadRatio < 0.5) {
			return Cesium.Color.GREEN.withAlpha(1);
		} else if (loadRatio < 1) {
			return Cesium.Color.YELLOW.withAlpha(1);
		} else {
			return Cesium.Color.RED.withAlpha(1);
		}
	}
}



export class RoadNetworkLayer2 {

	private map: CesiumMap;
	private dataSource: Cesium.CustomDataSource;
	public items: Array<RouteSegment> = [];
	private elapsedTime: Writable<number>;

	//private infobox: InfoBox | undefined;
	private hovered: Writable<RouteSegment | undefined> = writable(undefined);

	public infoboxTimeOut: NodeJS.Timeout  | undefined;

	constructor(map: CesiumMap, elapsedTime: Writable<number>) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.dataSource = new Cesium.CustomDataSource();
		this.map.viewer.dataSources.add(this.dataSource);
	}

	public add(item: RouteFeature): void {
		const routeSegment = new RouteSegment(item, this.elapsedTime, this.dataSource);
		this.items.push(routeSegment);
	}

	public remove(item: RouteSegment): void {
		this.items = this.items.filter((item) => item.id !== item.id);
	}

	public clear(): void {
		this.map.viewer.dataSources.remove(this.dataSource);
	}

	public getItemById(id: string): RouteSegment | undefined {
		return this.items.find((item) => item.id === id);
	}
}

