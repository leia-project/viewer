import { writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Hexagon } from "./hexagons/hexagon";
import { HexagonLayer } from "./hexagons/hexagon-layer";
import { RoadNetwork } from "./roads/road-network";
import { notifications } from "$lib/components/map-core/notifications/notifications";
import { Map } from "$lib/components/map-cesium/module/map";
import { Evacuation } from "./evacuation";


export class EvacuationController {

	private map: Map;
	private elapsedTime: Writable<number>;
	public roadNetwork: RoadNetwork;
	public hexagonLayer: HexagonLayer;

	private hoveredFeature: Writable<any> = writable(undefined);

	public evacuations: Writable<Array<Evacuation>> = writable([]);

	get hexagons(): Array<Hexagon> {
		return this.hexagonLayer.hexagons;
	}
	
	constructor(map: Map, scenario: string, elapsedTime: Writable<number>, outline: {type: string, coordinates: Array<Array<[lon: number, lat: number]>>}) {
		this.map = map;
		this.roadNetwork = new RoadNetwork(map, this.evacuations);
		this.hexagonLayer = new HexagonLayer(map, scenario, outline);
		this.elapsedTime = elapsedTime;
		this.elapsedTime.subscribe((time: number) => {
			this.hexagons.forEach((hex: Hexagon) => hex.timeUpdated(time));
		});
		this.addMouseEvents();
	}

	public async createEvacuation(hexagon: Hexagon): Promise<void> {
		const routeResult = await this.roadNetwork.createEvacuationRoute(hexagon.center);
		if (routeResult === undefined) {
			// handle no route found
			return;
		}
		const evacuation = new Evacuation(routeResult.route, hexagon, routeResult.extractionPoint);
		hexagon.addEvacuation(evacuation);
		this.evacuations.update((evacs) => [...evacs, evacuation]);
	}

	public removeEvacuation(evacuation: Evacuation): void {
		//this.evacuations = this.evacuations.filter((e) => e !== evacuation);
		// update bottleneck capacities
	}

	public cancelEvacuation(hexagon: Hexagon): void {
		if (hexagon.evacuation) {
			this.removeEvacuation(hexagon.evacuation);
			hexagon.evacuation = undefined;
		}
	}

 	private addMouseEvents(): void {
		this.map.on("mouseLeftClick", this.leftClickHandle);
		this.map.on("mouseMove", this.moveHandle);
	}

	private removeMouseEvents(): void {
		this.map.off("mouseLeftClick", this.leftClickHandle);
		this.map.off("mouseMove", this.moveHandle);
	}

	private getObjectFromMouseLocation(m: any): any {
		const location = new Cesium.Cartesian2(m.x, m.y);
		if (!location) return undefined;
		return this.map.viewer.scene.pick(location);
	}

	private moveHandle = (m: any): void => {
		const obj = this.getObjectFromMouseLocation(m);
	}

	private leftClickHandle = (m: any): void => {
		const picked = this.getObjectFromMouseLocation(m);
		this.hexagonLayer.onLeftClick(picked);
		this.roadNetwork.onLeftClick(picked);
	}

}
