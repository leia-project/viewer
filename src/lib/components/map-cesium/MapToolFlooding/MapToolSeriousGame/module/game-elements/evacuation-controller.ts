import { derived, get, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Hexagon } from "./hexagons/hexagon";
import { HexagonLayer } from "./hexagons/hexagon-layer";
import { RoadNetwork } from "./roads/road-network";
import { Map as CesiumMap } from "$lib/components/map-cesium/module/map";
import { Evacuation } from "./evacuation";
import type { Game } from "../game";
import type { IGameConfig } from "../models";


export class EvacuationController {

	private game: Game;
	private map: CesiumMap;
	private elapsedTime: Writable<number>;
	public roadNetwork: RoadNetwork;
	public hexagonLayer: HexagonLayer;
	public evacuations: Readable<Array<Evacuation>>;
	
	constructor(game: Game, map: CesiumMap, gameConfig: IGameConfig) {
		this.game = game;
		this.map = map;
		this.elapsedTime = game.elapsedTime;
		const scenarioName = `${gameConfig.breach.properties.dijkring}_${gameConfig.breach.properties.name}_${gameConfig.scenario}`;
		this.hexagonLayer = new HexagonLayer(map, this.elapsedTime, [scenarioName], gameConfig.outline, this);
		this.evacuations = derived(
			this.hexagonLayer.hexagons.map((h) => h.evacuations),
			($evacuations, set) => {
				const allEvacuations = $evacuations.flat();
				set(allEvacuations);
			}
		);
		this.roadNetwork = new RoadNetwork(map, this.elapsedTime, gameConfig.outlineRoadNetwork);
		this.addMouseEvents();
	}

	public async evacuate(hexagon: Hexagon | undefined = get(this.hexagonLayer.selectedHexagon)): Promise<void> {
		if (!hexagon) {
			this.game.notificationLog.send({
				type: "error",
				title: "Evacuation Error",
				message: "No hexagon selected for evacuation.",
			})
			return;
		}
		const routeResults = await this.roadNetwork.evacuateHexagon(hexagon);
		if (routeResults === undefined) {
			   this.game.notificationLog.send({
					type: "error",
					title: "Evacuation Error",
					message: "No route found for evacuation.",
				});
			return;
		}
		const newEvacuations = routeResults.map((routeResult) => {
			return new Evacuation(routeResult.route, hexagon, routeResult.extractionPoint, routeResult.numberOfPersons, get(this.elapsedTime), this.map);
  		});
		const aggregatedEvacuations = this.aggregateEvacuations(newEvacuations);
		hexagon.addEvacuations(aggregatedEvacuations);
	}

	private aggregateEvacuations(evacuations: Array<Evacuation>): Array<Evacuation> {
		const map = new Map<string, Evacuation>();
		for (const evac of evacuations) {
			const fidConcat = evac.route.map((r) => r.feature.properties.fid).join(",");
			const key = `${evac.hexagon.hex}|${fidConcat}|${evac.extractionPoint.id}`;
			if (map.has(key)) {
				const aggEvac = map.get(key);
				if (aggEvac) aggEvac.numberOfPersons += evac.numberOfPersons;
			} else {
				map.set(key, evac);
			}
		}
		return Array.from(map.values());
	}

	public deleteEvacuation(evacuation: Evacuation): void {
		this.roadNetwork.onEvacuationDelete(evacuation);
		evacuation.hexagon.removeEvacuation(evacuation);
	}

	public cancelHexagonEvacuation(hexagon: Hexagon, time: number = get(this.elapsedTime)): void {
		get(hexagon.evacuations).forEach((evacuation: Evacuation) => {
			this.roadNetwork.onEvacuationDelete(evacuation);
			hexagon.removeEvacuation(evacuation);
		});
	}

 	private addMouseEvents(): void {
		this.map.on("mouseMove", this.moveHandle);
		this.map.on("mouseLeftClick", this.leftClickHandle);
	}

	private removeMouseEvents(): void {
		this.map.off("mouseMove", this.moveHandle);
		this.map.off("mouseLeftClick", this.leftClickHandle);
	}

	private getObjectFromMouseLocation(m: any): any {
		const location = new Cesium.Cartesian2(m.x, m.y);
		if (!location) return undefined;
		return this.map.viewer.scene.pick(location);
	}

	private moveHandle = (m: any): void => {
		const obj = this.getObjectFromMouseLocation(m);
		this.hexagonLayer.onMouseMove(obj);
		this.roadNetwork.onMouseMove(obj);
		if (!obj) {
			this.map.viewer.scene.canvas.style.cursor = "default";
		}
	}

	private leftClickHandle = (m: any): void => {
		const picked = this.getObjectFromMouseLocation(m);
		this.hexagonLayer.onLeftClick(picked);
		this.roadNetwork.onLeftClick(picked);
	}

}
