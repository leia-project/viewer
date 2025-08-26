import { get, writable, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map, GeoJSONFeature } from "../../../external-dependencies";
import type { FloodLayerController } from "../../../../layer-controller";

import { Evacuation } from "../evacuation";
import { RoutingAPI, type RouteFeature } from "../api/routing-api";
import NodeHoverBox from "../../../components/infobox/NodeHoverBox.svelte";
import type { Hexagon } from "../hexagons/hexagon";
import { RoadNetworkLayer, RouteSegment } from "./route-segments";
import { getNetworkPGRest } from "../api/routing/graph";
import { BlockMeasure, WidenMeasure, RaiseMeasure, Measure, type IMeasureConfig } from "./measure";
import type { NotificationLog } from "../../notification-log";

import measuresJSON from "./measure-config.json";
import type { RouteResult } from "../../models";


export class RoadNetwork {

	public map: Map;
	public routingAPI: RoutingAPI;
	private outline: Array<[lon: number, lat: number]>;
	private floodLayerController: FloodLayerController;

	public roadNetworkLayer: RoadNetworkLayer;
	private extractionPointIds: Array<string>;
	public selectedExtractionPoint: Writable<RouteSegment  | undefined> = writable(undefined);
	public measures: Array<Measure> = [];
	public measureToggled: Writable<boolean> = writable(true);

	private elapsedTime: Writable<number>;

	private selectedNode: Writable<RouteSegment | Measure | undefined> = writable(undefined);
	private selectBox: NodeHoverBox | undefined;
	public selectTimeOut: NodeJS.Timeout | undefined;
	private currentlySelected: RouteSegment | Measure | undefined = undefined;

	public hoveredNode: Writable<RouteSegment | Measure | undefined> = writable(undefined);
	private hoverBox: NodeHoverBox | undefined;
	public hoverTimeOut: NodeJS.Timeout | undefined;
	private currentlyHovered: RouteSegment | Measure | undefined = undefined;

	public loaded: Writable<boolean> = writable(false);

	constructor(map: Map, elapsedTime: Writable<number>, timeGaps: Readable<{ before?: number, after?: number }>, outline: Array<[lon: number, lat: number]>, extractionPointIds: Array<string>, notificationLog: NotificationLog, floodLayerController: FloodLayerController) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.routingAPI = new RoutingAPI();

		this.outline = outline;
		this.extractionPointIds = extractionPointIds;
		this.floodLayerController = floodLayerController;
		this.roadNetworkLayer = new RoadNetworkLayer(map, elapsedTime, timeGaps, this.extractionPointIds);
		this.selectedExtractionPoint.subscribe((selectedExtractionPoint) => {
			this.roadNetworkLayer.segments.forEach((segment) => {
				if (segment.extractionPoint) segment.activeExtractionPoint = segment === selectedExtractionPoint;
			})
		});
		this.init();

		this.selectedNode.subscribe((node) => {
			this.selectSubscribe(node);
			if (node instanceof RouteSegment || node instanceof Measure) {
				this.hoverBox?.$destroy();
				this.selectBox?.$destroy();
				if (this.selectTimeOut) clearTimeout(this.selectTimeOut);
				this.selectBox = new NodeHoverBox({
					target: this.map.getContainer(),
					props: {
						node: node,
						store: this.selectedNode,
						timeout: this.selectTimeOut,
						map: this.map,
						type: "selected",
						notificationLog: notificationLog
					}
				});
			} else {
				this.selectTimeOut = setTimeout(() => this.selectBox?.$destroy(), 400);
			}
		});
		this.hoveredNode.subscribe((node) => {
			this.hoverSubscribe(node);
			if ((node instanceof RouteSegment || node instanceof Measure) && node !== get(this.selectedNode)) {
				this.hoverBox?.$destroy();
				if (this.hoverTimeOut) clearTimeout(this.hoverTimeOut);
				this.hoverBox = new NodeHoverBox({
					target: this.map.getContainer(),
					props: {
						node: node,
						store: this.hoveredNode,
						timeout: this.hoverTimeOut,
						map: this.map,
						type: "hover",
						notificationLog: notificationLog,
						selectStore: this.selectedNode,
					}
				});
			} else {
				this.hoverTimeOut = setTimeout(() => this.hoverBox?.$destroy(), 400);
			}
		});
	}

	private async init(): Promise<void> {
		this.loadMeasures();
		try {
			await this.retryLoadRoadNetwork();
			this.elapsedTime.subscribe((time: number) => this.cleanSetRoutingGraph(time));
			this.floodLayerController.floodedRoadsLayer.source.setupPromise?.then(() => {
				this.floodLayerController.floodedRoadsLayer.source.OgcFeaturesLoaderCesium.on("featuresLoaded", () => {
					this.cleanSetRoutingGraph(get(this.elapsedTime));
				});
			});
			this.loaded.set(true);
		} catch (error) {
			console.error("Failed to initialize road network after retries:", error);
		}
	}

	private async retryLoadRoadNetwork(retries: number = 5, delayMs: number = 1000): Promise<void> {
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				await this.loadRoadNetwork();
				return;
			} catch (error) {
				if (attempt < retries) {
					console.warn(`loadRoadNetwork failed, retrying in ${delayMs}ms... (${retries - attempt} retries left)`);
					await new Promise((resolve) => setTimeout(resolve, delayMs));
				} else {
					throw error;
				}
			}
		}
	}

	public async cleanSetRoutingGraph(time: number): Promise<void> {
		const floodedRoadFeatures = this.floodLayerController.floodedRoadsLayer.source.OgcFeaturesLoaderCesium.features || [];
		const floodedSegments = floodedRoadFeatures.map((f: GeoJSONFeature) => [f.properties.wvk_id, parseFloat(f.properties.flood_depth)] as [string, number]) || [];
		const floodedSegmentsWithMeasures = floodedSegments.map(([id, floodHeight]) => {
			const segment = this.roadNetworkLayer.getItemByWvkId(id);
			if (segment) {
				floodHeight -= segment.raisedBy;
				if (floodHeight > 0) {
					return segment.id;
				}
			}
			return null;
		}).filter((fid) => fid !== null) as Array<string>;

		const overloadedSegments = this.roadNetworkLayer.segments.filter((segment) => segment.overloaded(time)).map((segment) => segment.id);

		const blockedSegments = this.measures.filter((measure) => measure instanceof BlockMeasure && get(measure.applied)).map((measure) => measure.config.routeSegmentFids).flat();
		
		this.routingAPI.update(floodedSegmentsWithMeasures, overloadedSegments, blockedSegments);
	}

	private async loadRoadNetwork(): Promise<void> {
		const network = await getNetworkPGRest("zeeland_datacore", "car", this.outline); //await fetch("/data/zeeland_2/car/edges.geojson");
		network.edges.features.forEach((feature: RouteFeature) => {
			const segment = this.roadNetworkLayer.add(feature, false);
			for (const measure of this.measures) {
				if (measure.config.routeSegmentFids.includes(segment.id)) {
					measure.addRouteSegment(segment);
				}
			}
		});
		this.roadNetworkLayer.updatePrimitive();
	}

	private loadMeasures(): void {
		const measureConfig: Array<IMeasureConfig> = measuresJSON;
		const measures = measureConfig.map((c) => {
			if (c.type === "widen") {
				return new WidenMeasure(c, this.map);
			} else if (c.type === "raise") {
				return new RaiseMeasure(c, this.map);
			} else if (c.type === "block") {
				return new BlockMeasure(c, this.map);
			}
		});
		this.measures = measures.filter((m) => m !== undefined) as Array<Measure>;
		this.measureToggled.subscribe((toggled) => {
			this.measures.forEach((measure) => measure.toggle(toggled));
		});
	}

	public async evacuateHexagon(
		hexagon: Hexagon,
		extractionPoint: RouteSegment | undefined = get(this.selectedExtractionPoint),
		numberOfPersons: number = hexagon.population,
		personsPerCar: number
	): Promise<Array<RouteResult> | undefined> {
		if (!extractionPoint) {
			return [];
		}
		const totalPersons = Math.min(numberOfPersons, hexagon.population);
		const evacuationRoutes: Array<RouteResult> = [];
		let remainingPersons = totalPersons - get(hexagon.totalEvacuated);
		while (remainingPersons > 0) {
			const maxNumberOfCars = Math.ceil(remainingPersons / personsPerCar);
			const evacuationRoute = await this.createEvacuationRoute(hexagon, extractionPoint, maxNumberOfCars);
			if (!evacuationRoute) {
				break;
			}
			let evacuatedPersons = evacuationRoute.evacuatedCars * personsPerCar;
			// Ensure we do not evacuate more than remaining persons. The last car may not be full.
			if (evacuatedPersons > remainingPersons) {
				evacuatedPersons = remainingPersons;
			}
			evacuationRoutes.push({
				...evacuationRoute,
				numberOfPersons: evacuatedPersons
			});
			remainingPersons -= evacuatedPersons;
		}
		if (evacuationRoutes.length === 0) {
			console.error("No evacuation routes created.");
			return;
		}
		return evacuationRoutes;
	}

	public async createEvacuationRoute(hexagon: Hexagon, extractionPoint: RouteSegment, maxNumberOfCars: number): Promise<{ route: Array<RouteSegment>, extractionPoint: RouteSegment, evacuatedCars: number } | undefined> {
		const extractionLocation: [lon: number, lat: number] = [
			extractionPoint.lon,
			extractionPoint.lat
		];

		// 1. Get the shortest route to the extraction point
		let route: { type: string; features: Array<RouteFeature>; } | undefined;
		for (const evacuationPoint of hexagon.evacuationPoints) {
			route = await this.routingAPI.getRoute(evacuationPoint, extractionLocation);
			if (route && route.features.length > 0) break;
		}
		if (!route || route.features.length === 0) {
			console.error("No route found or route is empty.");
			return;
		}

		const currentStep = get(this.elapsedTime);

		// 2. Determine how many cars can be evacuated based on the route segments
		let minAvailableCarLoad = Infinity;
		const routeSegments: Array<RouteSegment> = [];
		route.features.forEach((feature: RouteFeature) => {
			const routeSegment = this.roadNetworkLayer.getItemById(feature.properties.fid.toString());
			if (routeSegment) {
				if (routeSegment.availableLoad < minAvailableCarLoad) {
					minAvailableCarLoad = routeSegment.availableLoad;
				}
				routeSegments.push(routeSegment);
			}
		});
		if (minAvailableCarLoad === Infinity || minAvailableCarLoad <= 0) {
			console.error("No available car load on the route segments.");
			return;
		}
		if (minAvailableCarLoad > maxNumberOfCars) {
			minAvailableCarLoad = maxNumberOfCars;
		}

		// 3. Update graph
		routeSegments.forEach((segment) => {
			segment.addLoad(minAvailableCarLoad, currentStep);
		});
		const overloadedSegments = routeSegments.filter((segment) => (segment.loadPerTimeStep.get(currentStep) || 0) >= segment.capacity);
		this.routingAPI.removeSegments(overloadedSegments.map((segment) => segment.id));

		return {
			route: routeSegments,
			extractionPoint: extractionPoint,
			evacuatedCars: minAvailableCarLoad
		};
	}

	public onEvacuationDelete(evacuation: Evacuation, setGraph: boolean = true): void {
		// remove loads from road segments
		evacuation.route.forEach((routeSegment) => {
			routeSegment.removeLoad(evacuation.numberOfPersons, get(this.elapsedTime));
		});

		// update graph
		if (setGraph) this.cleanSetRoutingGraph(get(this.elapsedTime));
	}

	private getPickedItem(picked: any): RouteSegment | Measure | undefined {
		let pickedItem: RouteSegment | Measure | undefined;
		if ((picked?.primitive instanceof Cesium.Primitive || picked?.primitive instanceof Cesium.GroundPolylinePrimitive) && picked?.id) {
			if (typeof picked?.id === "string") {
				if (picked.id.startsWith("extraction-")) {
					const itemId = picked.id.replace("extraction-", "");
					pickedItem = this.roadNetworkLayer.getItemById(itemId);
				} else if (picked.id.startsWith("segment-")) {
					const itemId = picked.id.replace("segment-", "");
					pickedItem = this.roadNetworkLayer.getItemById(itemId);
				} else if (picked.id.startsWith("measure")) {
					const measureName = picked.id.split("-")[2];
					pickedItem = this.measures.find((m) => m.config.name === measureName);
				}
			}
		} else if (picked?.id instanceof Cesium.Entity) {
			const entity = picked.id as Cesium.Entity;
			if (entity.id.startsWith("measure")) {
				pickedItem = this.measures.find((m) => m.config.name === entity.name);
			}
		}
		return pickedItem;
	}


	public onLeftClick(picked: any): void {
		const pickedItem = this.getPickedItem(picked);
		this.selectedNode.set(pickedItem);

		if (picked?.primitive instanceof Cesium.Primitive && picked?.id && picked.id.startsWith("extraction-")) {
			const itemId = picked.id.replace("extraction-", "");
			const extractionPointId = this.extractionPointIds.find((id) => id === itemId);
			if (extractionPointId) {
				const extractionPoint = this.roadNetworkLayer.getItemById(extractionPointId);
				if (extractionPoint) this.selectedExtractionPoint.set(extractionPoint);
			}
		}
	}

	public onMouseMove(picked: any): void {
		const pickedItem = this.getPickedItem(picked);
		this.hoveredNode.set(pickedItem);
	}

	private selectSubscribe(s: RouteSegment | Measure | undefined): void {
		if (this.currentlySelected && this.currentlySelected !== s) {
			this.currentlySelected.highlight(false);
		}
		if (s) {
			s.highlight(true);
			this.map.viewer.scene.canvas.style.cursor = "pointer";
		}
		this.currentlySelected = s;
		this.map.refresh();
	}

	private hoverSubscribe(h: RouteSegment | Measure | undefined): void {
		if (this.currentlyHovered && this.currentlyHovered !== h && this.currentlyHovered !== get(this.selectedNode)) {
			this.currentlyHovered.highlight(false);
		}
		if (h) {
			h.highlight(true);
			this.map.viewer.scene.canvas.style.cursor = "pointer";
		}
		this.currentlyHovered = h;
		this.map.refresh();
	}
}
