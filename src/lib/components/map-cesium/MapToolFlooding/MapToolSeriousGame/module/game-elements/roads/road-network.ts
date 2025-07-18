import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { Map } from "$lib/components/map-cesium/module/map";
import { Evacuation } from "../evacuation";
import { RoutingAPI, type RouteFeature } from "../api/routing-api";
import NodeHoverBox from "../../../components/infobox/NodeHoverBox.svelte";
import type { Hexagon } from "../hexagons/hexagon";
import { RoadNetworkLayer, RouteSegment } from "./route-segments";
import { PGRestAPI } from "../api/pg-rest-api";
import { getNetworkPGRest } from "../api/routing/graph";
import { BlockageMeasure, CapacityMeasure, HeightMeasure, Measure, type IMeasureConfig } from "./measure";
import type { NotificationLog } from "../../notification-log";

import measuresJSON from "./measure-config.json";


export class RoadNetwork {

	public map: Map;
	private routingAPI: RoutingAPI;
	private outline: Array<[lon: number, lat: number]>;

	private roadNetworkLayer: RoadNetworkLayer;
	private extractionPointIds: Array<string> = ["42376", "83224", "77776"];
	public selectedExtractionPoint: Writable<RouteSegment  | undefined> = writable(undefined);
	public measures: Array<Measure> = [];

	private pgRestAPI = new PGRestAPI();
	private elapsedTime: Writable<number>;

	private selectedNode: Writable<RouteSegment | Measure | undefined> = writable(undefined);
	private selectBox: NodeHoverBox | undefined;
	public selectTimeOut: NodeJS.Timeout | undefined;
	public hoveredNode: Writable<RouteSegment | Measure | undefined> = writable(undefined);
	private hoverBox: NodeHoverBox | undefined;
	public hoverTimeOut: NodeJS.Timeout | undefined;

	public loaded: Writable<boolean> = writable(false);

	constructor(map: Map, elapsedTime: Writable<number>, outline: Array<[lon: number, lat: number]>, notificationLog: NotificationLog) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.routingAPI = new RoutingAPI();

		this.outline = outline;
		this.roadNetworkLayer = new RoadNetworkLayer(map, elapsedTime, this.extractionPointIds);
		this.selectedExtractionPoint.subscribe((selectedExtractionPoint) => {
			this.roadNetworkLayer.segments.forEach((segment) => {
				if (segment.extractionPoint) segment.activeExtractionPoint = segment === selectedExtractionPoint;
			})
		});
		this.init();

		this.selectedNode.subscribe((node) => {
			if (node instanceof RouteSegment || node instanceof Measure) {
				this.hoverBox?.$destroy();
				this.selectBox?.$destroy();
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
			if ((node instanceof RouteSegment || node instanceof Measure) && node !== get(this.selectedNode)) {
				this.hoverBox?.$destroy();
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

	private init(): void {
		this.loadMeasures();
		this.loadRoadNetwork().then(() => {
			//this.assignSegmentsToMeasures();
			this.elapsedTime.subscribe((time: number) => this.cleanSetRoutingGraph(time));
			this.loaded.set(true);
		});
	}

	private async cleanSetRoutingGraph(time: number): Promise<void> {
		const floodedSegments: Array<[string, number]> = await this.pgRestAPI.getFloodedRoadSegments(time);
		const floodedSegmentsWithMeasures = floodedSegments.filter(([id, floodHeight]) => {
			const segment = this.roadNetworkLayer.getItemById(id);
			if (segment) {
				floodHeight -= segment?.raisedBy;
			}
			return segment && floodHeight > 0;
		}).map(([id, floodHeight]) => id);
		const blockedSegments = this.measures.filter((measure) => measure instanceof BlockageMeasure);
		const overloadedSegments = this.roadNetworkLayer.segments.filter((segment) => segment.overloaded(time)).map((segment) => segment.id);
		this.routingAPI.onTimeUpdate(floodedSegmentsWithMeasures, overloadedSegments);
	}

	private async loadRoadNetwork(): Promise<void> {
		const network = await getNetworkPGRest("zeeland_datacore", "car", this.outline); //await fetch("/data/zeeland_2/car/edges.geojson");
		const outline =  turf.polygon([this.outline.map((coord) => [coord[0], coord[1]])]);
		const filteredFeatures = network.edges.features.filter((feature: RouteFeature) => {
			//@ts-ignore
			if (feature.geometry.type === "MultiLineString") {
				feature.geometry.type = "LineString";
				//@ts-ignore
				feature.geometry.coordinates = feature.geometry.coordinates.flat();
			}
			return feature.geometry.coordinates.some((coord: [number, number]) => {
				const pt = turf.point(coord);
				return turf.booleanPointInPolygon(pt, outline) && feature.properties.fid !== undefined;
			});
		});
		network.edges.features.forEach((feature: RouteFeature) => {
			const segment = this.roadNetworkLayer.add(feature);
			for (const measure of this.measures) {
				if (measure.config.routeSegmentFids.includes(segment.id)) {
					measure.addRouteSegment(segment);
				}
			}
		});
	}

	private loadMeasures(): void {
		const measureConfig: Array<IMeasureConfig> = measuresJSON;
		const measures = measureConfig.map((c) => {
			if (c.type === "capacity") {
				return new CapacityMeasure(c, this.map);
			} else if (c.type === "height") {
				return new HeightMeasure(c, this.map);
			} else if (c.type === "blockage") {
				return new BlockageMeasure(c, this.map);
			}
		});
		this.measures = measures.filter((m) => m !== undefined) as Array<Measure>;
	}

	public async evacuateHexagon(hexagon: Hexagon): Promise<Array<{ route: Array<RouteSegment>, extractionPoint: RouteSegment, numberOfPersons: number }> | undefined> {
		const chunkSize = 1000; // Number of persons to evacuate in one go
		const totalPersons = hexagon.population;
		const evacuationRoutes: Array<{ route: Array<RouteSegment>, extractionPoint: RouteSegment, numberOfPersons: number }> = [];
		let remainingPersons = totalPersons;
		while (remainingPersons > 0) {
			const numberOfPersons = Math.min(remainingPersons, chunkSize);
			const evacuationRoute = await this.createEvacuationRoute(hexagon.center, numberOfPersons);
			if (!evacuationRoute) {
				console.error("No evacuation route found or route is empty.");
				return;
			}
			evacuationRoutes.push({
				...evacuationRoute,
				numberOfPersons: numberOfPersons
			});
			remainingPersons -= numberOfPersons;
		}
		if (evacuationRoutes.length === 0) {
			console.error("No evacuation routes created.");
			return;
		}
		return evacuationRoutes;
	}

	public async createEvacuationRoute(origin: [lon: number, lat: number], numberOfPersons: number): Promise<{ route: Array<RouteSegment>, extractionPoint: RouteSegment } | undefined> {
		const selectedExtractionPoint = get(this.selectedExtractionPoint);
		if (!selectedExtractionPoint) {
			return;
		}
		const extractionLocation: [lon: number, lat: number] = [
			selectedExtractionPoint.lon,
			selectedExtractionPoint.lat
		];
		const route = await this.routingAPI.getRoute(origin, extractionLocation);

		if (!route || route.features.length === 0) {
			console.error("No route found or route is empty.");
   			return;
		}

		// Update capacities
		const routeSegments: Array<RouteSegment> = [];
		route.features.forEach((feature: RouteFeature) => {
			const routeSegment = this.roadNetworkLayer.getItemById(feature.properties.fid.toString());
			if (routeSegment) {
				routeSegment.addLoad(numberOfPersons, get(this.elapsedTime));
				routeSegments.push(routeSegment);
			}
		});

		// Update graph
		const currentStep = get(this.elapsedTime);
		const overloadedSegments = routeSegments.filter((segment) => (segment.loadPerTimeStep.get(currentStep) || 0) > segment.capacity);
		this.routingAPI.removeSegments(overloadedSegments.map((segment) => segment.id));

		return {
			route: routeSegments,
			extractionPoint: selectedExtractionPoint
		};
	}

	public onEvacuationDelete(evacuation: Evacuation): void {
		// remove loads from road segments
		evacuation.route.forEach((routeSegment) => {
			routeSegment.removeLoad(evacuation.numberOfPersons, get(this.elapsedTime));
     	});

		// update graph
	}

	public onLeftClick(picked: any): void {
		let pickedItem: RouteSegment | Measure | undefined;
		if (picked?.primitive instanceof Cesium.Primitive && picked?.id) {
			if (typeof picked?.id === "string" && picked.id.endsWith("-top")) {
				picked.id = picked.id.slice(0, -4); // Remove "-top" suffix to get the hexagon id when clicking top hexagons
			}
			const extractionPointId = this.extractionPointIds.find((id) => id === picked.id);
			if (extractionPointId) {
				const extractionPoint = this.roadNetworkLayer.getItemById(extractionPointId);
				if (extractionPoint) this.selectedExtractionPoint.set(extractionPoint);
			}
			pickedItem = this.roadNetworkLayer.getItemById(picked.id);
		} else if (picked?.id instanceof Cesium.Entity) {
			const entity = picked.id as Cesium.Entity;
			if (entity.id.startsWith("measure-")) {
				const measureName = entity.id.replace("measure-", "").replace("line-", "");
				pickedItem = this.measures.find((m) => m.config.name === measureName);
			} else if (entity.id.startsWith("segment-")) {
				const segmentId = entity.id.replace("segment-", "");
				const segment = this.roadNetworkLayer.getItemById(segmentId);
				pickedItem = segment;
			}
		}

		const currentlyHovered = get(this.hoveredNode);
		if (currentlyHovered && currentlyHovered !== pickedItem) {
			currentlyHovered.highlight(false);
		}
		pickedItem?.highlight(true);

		if (pickedItem) this.map.viewer.scene.canvas.style.cursor = "pointer";
		this.selectedNode.set(pickedItem);
	}

	public onMouseMove(picked: any): void {
		let pickedItem: RouteSegment | Measure | undefined;
		if (picked?.primitive instanceof Cesium.Primitive && picked?.id) {
			if (typeof picked?.id === "string" && picked.id.endsWith("-top")) {
				picked.id = picked.id.slice(0, -4); // Remove "-top" suffix to get the hexagon id when clicking top hexagons
			}
			pickedItem = this.roadNetworkLayer.getItemById(picked.id);
		} else if (picked?.id instanceof Cesium.Entity) {
			const entity = picked.id as Cesium.Entity;
			if (entity.id.startsWith("segment-")) {
				const entityID = entity.id.replace("segment-", "");
				pickedItem = this.roadNetworkLayer.getItemById(entityID);
			} else if (entity.id.startsWith("measure-")) {
				pickedItem = this.measures.find((m) => m.config.name === entity.name);					
			}
		}

		const currentlyHovered = get(this.hoveredNode);
		if (currentlyHovered && currentlyHovered !== pickedItem && currentlyHovered !== get(this.selectedNode)) {
			currentlyHovered.highlight(false);
		}
		pickedItem?.highlight(true);

		if (pickedItem) this.map.viewer.scene.canvas.style.cursor = "pointer";
		this.hoveredNode.set(pickedItem);
	}
	
}






/* 
	private getBottlenecksOnRoute(route: Array<RouteFeature>): Array<BottleNeck> {
		const distanceThreshold = 1000;
		return this.bottlenecks.filter((bottleneck) => {
			return route.some((routeFeature) => {
				return Cesium.Cartesian3.distance(
					Cesium.Cartesian3.fromDegrees(bottleneck.lon, bottleneck.lat),
					Cesium.Cartesian3.fromDegrees(routeFeature.geometry.coordinates[0][0], routeFeature.geometry.coordinates[0][1])
				) < distanceThreshold;
			});
		});
	}

	private routeHasSufficientCapacity(route: Array<RouteFeature>, evacuees: number): Array<{ bottleneck: BottleNeck, hasCapacity: boolean }> {
		const bottlenecksOnRoute = this.getBottlenecksOnRoute(route);
		const res: Array<{ bottleneck: BottleNeck, hasCapacity: boolean }> = [];
		for (const bottleneck of bottlenecksOnRoute) {
			const hasCapacity = bottleneck.capacity >= evacuees;
			res.push({ bottleneck, hasCapacity });
		}
		return res;
	}

	public updateBottleneckCapacities(): void {
		this.bottlenecks.forEach((bottleneck) => {
			bottleneck.currentLoad = 0; // Reset current load
		});

		get(this.evacuations)
			.filter((evacuation) => evacuation.time === get(this.elapsedTime))
			.forEach((evacuation) => {
				evacuation.includedBottlenecks.forEach((bottleneck) => {
					const currentBottleneck = this.bottlenecks.find((bn) => bn.id === bottleneck.id);
					if (currentBottleneck) {
						const newLoad = currentBottleneck.currentLoad + evacuation.hexagon.population; // Increment the load for each evacuation
						currentBottleneck.updateLoad(newLoad);
					}
				});
		});
	}
*/
