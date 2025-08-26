import { derived, get, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { NotificationType, type MouseLocation, type Map as CesiumMap } from "../../external-dependencies";

import type { Game } from "../game";
import type { FloodLayerController } from "../../../layer-controller";
import type { EvacuationLogItem, MeasureLogItem } from "../models";
import type { RouteSegment } from "./roads/route-segments";
import type { Hexagon } from "./hexagons/hexagon";
import { HexagonLayer } from "./hexagons/hexagon-layer";
import { RoadNetwork } from "./roads/road-network";
import { Evacuation } from "./evacuation";


export interface EvacuationGroup {
	hexagon: Hexagon;
	extractionPoint: RouteSegment;
	time: number;
	evacuations: Array<Evacuation>;
}


export class EvacuationController {

	public game: Game;
	public map: CesiumMap;
	public elapsedTime: Writable<number>;
	public roadNetwork: RoadNetwork;
	public hexagonLayer: HexagonLayer;
	public evacuations!: Readable<Array<Evacuation>>;
	public evacuationsGrouped!: Readable<Array<EvacuationGroup>>;
	private loaded: Readable<boolean>;

	constructor(game: Game, floodLayerController: FloodLayerController) {
		this.game = game;
		this.map = game.map;
		this.elapsedTime = game.elapsedTime;
		const scenarioName = `${game.breach.properties.dijkring}_${game.breach.properties.name}_${game.gameConfig.scenario}`;
		this.hexagonLayer = new HexagonLayer(this, [scenarioName], game.gameConfig.outline);
		this.hexagonLayer.loaded.subscribe(() => {
			this.evacuations = derived(
				this.hexagonLayer.hexagons.map((h) => h.evacuations),
				($evacuations, set) => {
					const allEvacuations = $evacuations.flat();
					set(allEvacuations);
				}
			);
			this.evacuationsGrouped = derived(
				this.evacuations,
				($evacuations, set) => {
					const grouped = $evacuations.reduce((acc, evacuation) => {
						const key = `${evacuation.hexagon.hex}|${evacuation.extractionPoint.id}|${evacuation.time}`;
						if (!acc[key]) {
							acc[key] = {
								hexagon: evacuation.hexagon,
								extractionPoint: evacuation.extractionPoint,
								time: evacuation.time,
								evacuations: []
							};
						}
						acc[key].evacuations.push(evacuation);
						return acc;
					}, {} as Record<string, EvacuationGroup>);
					set(Object.values(grouped));
				}
			);
			this.elapsedTime.subscribe(() => {
				get(this.evacuations).forEach((evacuation) => evacuation.toggle([], false));
			});
		});
		this.roadNetwork = new RoadNetwork(this.map, this.elapsedTime, game.timeGaps, game.gameConfig.outlineRoadNetwork, game.gameConfig.extractionPointIds, game.notificationLog, floodLayerController);
		this.game.inPreparationPhase.subscribe((inPreparation) => {
			this.roadNetwork.measures.forEach((measure) => {
				measure.inPreparationPhase(inPreparation);
			});
		});
		this.addMouseEvents();
		this.loaded = derived(
			[this.hexagonLayer.loaded, this.roadNetwork.loaded],
			([$hexagonsLoaded, $roadsLoaded]) => $hexagonsLoaded && $roadsLoaded
		);
	}


	public async evacuate(
		hexagon: Hexagon | undefined = get(this.hexagonLayer.selectedHexagon),
		extractionPoint: RouteSegment | undefined = get(this.roadNetwork.selectedExtractionPoint),
		timeStep: number = get(this.elapsedTime),
		totalNumberOfPersons?: number
	): Promise<void> {
		if (!hexagon) {
			this.game.notificationLog.send({
				type: NotificationType.ERROR,
				title: "Evacuation Error",
				message: "No hexagon selected for evacuation.",
			})
			return;
		}
		const routeResults = await this.roadNetwork.evacuateHexagon(hexagon, extractionPoint, totalNumberOfPersons, this.game.gameConfig.personsPerCar);
		if (routeResults === undefined) {
			   this.game.notificationLog.send({
					type: NotificationType.ERROR,
					title: "Evacuation Error",
					message: "No route found for evacuation.",
				});
			return;
		}
		const newEvacuations = routeResults.map((routeResult) => {
			return new Evacuation(routeResult.route, hexagon, routeResult.extractionPoint, routeResult.numberOfPersons, routeResult.evacuatedCars, timeStep, this.map);
  		});
		const aggregatedEvacuations = this.aggregateEvacuations(newEvacuations);
		hexagon.addEvacuations(aggregatedEvacuations);
		this.game.save();
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

	public deleteEvacuation(evacuation: Evacuation, setGraph: boolean = true): void {
		this.roadNetwork.onEvacuationDelete(evacuation, setGraph);
		evacuation.hexagon.removeEvacuation(evacuation);
		this.game.save();
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

	private getObjectFromMouseLocation(m: MouseLocation): any {
		const location = new Cesium.Cartesian2(m.x, m.y);
		if (!location) return undefined;
		return this.map.viewer.scene.pick(location);
	}

	private moveHandle = (m: any): void => {
		const obj = this.getObjectFromMouseLocation(m);
		this.hexagonLayer.onMouseMove(obj, m);
		this.roadNetwork.onMouseMove(obj);
		if (!obj) {
			this.map.viewer.scene.canvas.style.cursor = "default";
		}
	}

	private leftClickHandle = (m: any): void => {
		const picked = this.getObjectFromMouseLocation(m);
		this.hexagonLayer.onLeftClick(picked, m);
		this.roadNetwork.onLeftClick(picked);
	}


	public preload(savedEvacuations: Array<EvacuationLogItem>, savedMeasures: Array<MeasureLogItem>): void {
		this.loaded.subscribe((isLoaded) => {
			if (isLoaded) {			
				savedEvacuations.forEach((savedEvacuation) => {
					const hexagon = this.hexagonLayer.hexagons.find((h) => h.hex === savedEvacuation.hexagonId);
					const extractionPoint = this.roadNetwork.roadNetworkLayer.segments.find((s) => s.id === savedEvacuation.extractionPointId);
					const route = savedEvacuation.routeSegmentIds.map((id) => this.roadNetwork.roadNetworkLayer.segments.find((s) => s.id === id)).filter((s): s is RouteSegment => !!s);
					if (hexagon && extractionPoint) {
						const evacuation = new Evacuation(
							route,
							hexagon,
							extractionPoint,
							savedEvacuation.numberOfPersons,
							savedEvacuation.numberOfCars,
							savedEvacuation.time,
							this.map
						);
						hexagon.addEvacuations([evacuation]);
					}
					route.forEach((segment) => {
						segment.addLoad(savedEvacuation.numberOfCars, savedEvacuation.time);
					});
				});

				savedMeasures.forEach((savedMeasure) => {
					const measure = this.roadNetwork.measures.find((m) => m.config.id === savedMeasure.id);
					if (measure) {
						measure.applied.set(savedMeasure.applied);
					}
				});

				this.roadNetwork.cleanSetRoutingGraph(get(this.elapsedTime));
			}
		});
	}

}
