import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { Map } from "$lib/components/map-cesium/module/map";
import { ExtractionPoint, BottleNeck, RoadNetworkLayer, RoadNetworkLayerP } from "./extraction-points";
import { Evacuation } from "../evacuation";
import { RoutingAPI, type RouteFeature } from "../api/routing-api";
import NodeHoverBox from "../../../components/infobox/NodeHoverBox.svelte";
import type { Hexagon } from "../hexagons/hexagon";
import { RoadNetworkLayer2, RouteSegment } from "./route-segments";
import { PGRestAPI } from "../api/pg-rest-api";

const extractionPointsConfig = [
	{
		id: "extraction1",
		position: { lat: 51.33098, lon: 3.80102 }
	},
	{
		id: "extraction2",
		position: { lat: 51.67719, lon: 3.72817 }
	},
	{
		id: "extraction3",
		position: { lat: 51.64000, lon: 3.93750 }
	}
];

const bottlenecksConfig = [
	{
		id: "bottleneck1",
		position: { lat: 51.60048, lon: 3.68215 },
		capacity: 10000
	},
	{
		id: "bottleneck2",
		position: { lat: 51.48279, lon: 3.87022 },
		capacity: 5000
	}
];


export class RoadNetwork {

	public map: Map;
	private routingAPI: RoutingAPI;
	private extractionPoints: Array<ExtractionPoint> = [];
	private exctractionPointLayer: RoadNetworkLayer<ExtractionPoint>;
	public selectedExtractionPoint: Writable<ExtractionPoint  | undefined> = writable(undefined);
	private bottlenecks: Array<BottleNeck> = [];
	private bottleneckLayer: RoadNetworkLayerP<BottleNeck>;

	private outline: Array<[lon: number, lat: number]>;
	private roadSegmentsLayer: RoadNetworkLayer2;
	private floodedSegments: Array<any> = [];

	private pgRestAPI = new PGRestAPI();
	private elapsedTime: Writable<number>;

	private hoveredNode: Writable<ExtractionPoint | BottleNeck | undefined> = writable(undefined);
	private nodeHoverBox: NodeHoverBox | undefined;
	public sensorHoverBoxTimeOut: NodeJS.Timeout | undefined;

	constructor(map: Map, elapsedTime: Writable<number>, outline: Array<[lon: number, lat: number]>) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.routingAPI = new RoutingAPI();
		this.exctractionPointLayer = new RoadNetworkLayer<ExtractionPoint>(map);
		this.bottleneckLayer = new RoadNetworkLayerP<BottleNeck>(map);
		this.outline = outline;
		this.roadSegmentsLayer = new RoadNetworkLayer2(map, elapsedTime);
		this.init();

		this.hoveredNode.subscribe((node) => {
			if (node instanceof BottleNeck) {
				this.nodeHoverBox?.$destroy();
				this.nodeHoverBox = new NodeHoverBox({
					target: map.getContainer(),
					props: {
						node: node,
						roadNetwork: this
					}
				});
			} else {
				this.sensorHoverBoxTimeOut = setTimeout(() => this.nodeHoverBox?.$destroy(), 400);
			}
		});
	}

	private init(): void {
		this.loadExtractionPoints();
		//this.loadBottlenecks();
		this.loadRoadNetwork();
		this.elapsedTime.subscribe((time: number) => this.cleanSetRoutingGraph(time));
	}

	private async cleanSetRoutingGraph(time: number): Promise<void> {
		const floodedSegments = await this.pgRestAPI.getFloodedRoadSegments(time);
		const overloadedSegments = this.roadSegmentsLayer.items.filter((segment) => segment.overloaded(time)).map((segment) => segment.id);
		this.routingAPI.onTimeUpdate(floodedSegments, overloadedSegments);
	}

	private loadExtractionPoints(): void {
		const extractionPoints = extractionPointsConfig;
		extractionPoints.forEach((point) => {
			const extractionPoint = new ExtractionPoint(point.id, point.position.lon, point.position.lat, this.selectedExtractionPoint);
			this.extractionPoints.push(extractionPoint);
			this.exctractionPointLayer.add(extractionPoint);
		});
	}

	private loadBottlenecks(): void {
		const bottlenecks = bottlenecksConfig;
		bottlenecks.forEach((bottleneck) => {
			const newBottleneck = new BottleNeck(bottleneck.id, bottleneck.position.lon, bottleneck.position.lat, bottleneck.capacity);
			this.bottlenecks.push(newBottleneck);
			this.bottleneckLayer.add(newBottleneck);
		});
	}

	private async loadRoadNetwork(): Promise<void> {
		const res = await fetch("/data/zeeland_2/car/edges.geojson");
		const geojson = await res.json();
		const outline =  turf.polygon([this.outline.map((coord) => [coord[0], coord[1]])]);
		const filteredFeatures = geojson.features.filter((feature: RouteFeature) => {
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
		geojson.features/* .slice(0, 5000) */.forEach((feature: RouteFeature) => {
			this.roadSegmentsLayer.add(feature);
		});
	}

	public async evacuateHexagon(hexagon: Hexagon): Promise<Array<{ route: Array<RouteSegment>, extractionPoint: ExtractionPoint, numberOfPersons: number }> | undefined> {
		const chunkSize = 1000; // Number of persons to evacuate in one go
		const totalPersons = hexagon.population;
		const evacuationRoutes: Array<{ route: Array<RouteSegment>, extractionPoint: ExtractionPoint, numberOfPersons: number }> = [];
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

	public async createEvacuationRoute(origin: [lon: number, lat: number], numberOfPersons: number): Promise<{ route: Array<RouteSegment>, extractionPoint: ExtractionPoint } | undefined> {
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
			const routeSegment = this.roadSegmentsLayer.getItemById(feature.properties.fid.toString());
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

		// update graph
	}

	public onLeftClick(picked: any): void {
		// if extraction point is clicked, set it as the selected extraction point
		if (picked?.id instanceof Cesium.Entity) {
			const extractionPoint = this.extractionPoints.find((ep) => ep.entity === picked.id);
			if (extractionPoint) {
				this.selectedExtractionPoint.set(extractionPoint);
			}
		}
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
