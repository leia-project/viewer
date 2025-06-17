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



export class RoadNetwork {

	public map: Map;
	private routingAPI: RoutingAPI;
	private extractionPointIds: Array<string> = ["42377", "83224", "77776"];
	public selectedExtractionPoint: Writable<RouteSegment  | undefined> = writable(undefined);

	private outline: Array<[lon: number, lat: number]>;
	private roadNetworkLayer: RoadNetworkLayer;

	private pgRestAPI = new PGRestAPI();
	private elapsedTime: Writable<number>;

	private hoveredNode: Writable<RouteSegment | undefined> = writable(undefined);
	private nodeHoverBox: NodeHoverBox | undefined;
	public sensorHoverBoxTimeOut: NodeJS.Timeout | undefined;

	constructor(map: Map, elapsedTime: Writable<number>, outline: Array<[lon: number, lat: number]>) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.routingAPI = new RoutingAPI();

		this.outline = outline;
		this.roadNetworkLayer = new RoadNetworkLayer(map, elapsedTime, this.extractionPointIds);
		this.init();

		this.hoveredNode.subscribe((node) => {
			if (node instanceof RouteSegment) {
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
		this.loadRoadNetwork();
		this.elapsedTime.subscribe((time: number) => this.cleanSetRoutingGraph(time));
	}

	private async cleanSetRoutingGraph(time: number): Promise<void> {
		const floodedSegments = await this.pgRestAPI.getFloodedRoadSegments(time);
		const overloadedSegments = this.roadNetworkLayer.segments.filter((segment) => segment.overloaded(time)).map((segment) => segment.id);
		this.routingAPI.onTimeUpdate(floodedSegments, overloadedSegments);
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
		network.edges.features/* .slice(0, 5000) */.forEach((feature: RouteFeature) => {
			this.roadNetworkLayer.add(feature);
		});
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
		if (picked?.primitive instanceof Cesium.Primitive && picked?.id) {
			if (typeof picked?.id === "string" && picked.id.endsWith("-top")) {
				picked.id = picked.id.slice(0, -4); // Remove "-top" suffix to get the hexagon id when clicking top hexagons
			}
			const extractionPointId = this.extractionPointIds.find((id) => id === picked.id);
			if (extractionPointId) {
				const extractionPoint = this.roadNetworkLayer.getItemById(extractionPointId);
				if (extractionPoint) this.selectedExtractionPoint.set(extractionPoint);
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
