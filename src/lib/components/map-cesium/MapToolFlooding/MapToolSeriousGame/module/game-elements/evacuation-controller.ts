import { get, writable, type Writable } from "svelte/store";
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

	public evacuations: Writable<Array<Evacuation>> = writable([]);
	
	constructor(map: Map, scenario: string, elapsedTime: Writable<number>, outline: {type: string, coordinates: Array<Array<[lon: number, lat: number]>>}) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.roadNetwork = new RoadNetwork(map, elapsedTime, this.evacuations);
		this.hexagonLayer = new HexagonLayer(map, elapsedTime, scenario, outline);

		this.hexagonLayer.selectedHexagon.subscribe((hex: Hexagon | undefined) => {
			get(this.evacuations).forEach((evacuation: Evacuation) => {
				if (evacuation.hexagon === hex) {
					evacuation.display();
				} else {
					evacuation.hide();
				}
			});
		});

		this.addMouseEvents();
	}

	public async createEvacuation(): Promise<void> {
		const hexagon = get(this.hexagonLayer.selectedHexagon);
		if (!hexagon) {
			//notifications.error("No hexagon selected for evacuation.");
			return;
		}
		const routeResult = await this.roadNetwork.createEvacuationRoute(hexagon.center);
		if (routeResult === undefined) {
			// handle no route found
			// notifications.error("No capacity left for this evacuation!");
			return;
		}
		const evacuation = new Evacuation(routeResult.route, hexagon, routeResult.extractionPoint, routeResult.bottlenecks, get(this.elapsedTime));
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
