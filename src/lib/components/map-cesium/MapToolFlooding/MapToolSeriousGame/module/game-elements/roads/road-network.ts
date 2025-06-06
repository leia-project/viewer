import * as Cesium from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";
import { ExtractionPoint, BottleNeck, RoadNetworkLayer } from "./bottle-neck";
import { Evacuation } from "../evacuation";
import { RoutingAPI, type RouteFeature } from "../api/routing-api";
import type { Writable } from "svelte/store";


const extractionPointsConfig = [
	{
		id: "extraction1",
		position: { lat: 51.32847, lon: 3.79669 }
	},
	{
		id: "extraction2",
		position: { lat: 51.67628, lon: 3.72604 }
	},
	{
		id: "extraction3",
		position: { lat: 51.69494, lon: 4.17936 }
	}
];

const bottlenecksConfig = [
	{
		id: "bottleneck1",
		position: { lat: 51.64899, lon: 4.01277 },
		capacity: 50
	},
	{
		id: "bottleneck2",
		position: { lat: 51.70712, lon: 3.85497 },
		capacity: 75
	}
];


export class RoadNetwork {

	private routingAPI: RoutingAPI;
	private evacuations: Writable<Array<Evacuation>>;
	private extractionPoints: Array<ExtractionPoint> = [];
	private exctractionPointLayer: RoadNetworkLayer<ExtractionPoint>;
	public selectedExtractionPoint: ExtractionPoint | undefined;
	private bottlenecks: Array<BottleNeck> = [];
	private bottleneckLayer: RoadNetworkLayer<BottleNeck>;
	private blockedSegments: Array<any> = [];

	constructor(map: Map, evacuations: Writable<Array<Evacuation>>) {
		this.routingAPI = new RoutingAPI();
		this.evacuations = evacuations;
		this.exctractionPointLayer = new RoadNetworkLayer<ExtractionPoint>(map);
		this.bottleneckLayer = new RoadNetworkLayer<BottleNeck>(map);
		this.init();
	}

	private init(): void {
		this.loadExtractionPoints();
		this.loadBottlenecks();
		this.evacuations.subscribe((evacuations: Array<Evacuation>) => {
			// get active evacuations (in progress) const activeEvacuations = evacuations.filter((e) => e.step > currentStep);
			this.updateBottleneckCapacities(evacuations);
		});
	}

	private loadExtractionPoints(): void {
		const extractionPoints = extractionPointsConfig;
		extractionPoints.forEach((point) => {
			const extractionPoint = new ExtractionPoint(point.id, point.position.lon, point.position.lat);
			this.extractionPoints.push(extractionPoint);
			this.exctractionPointLayer.add(extractionPoint);
		});
		this.selectedExtractionPoint = this.extractionPoints[0]; // Set default extraction point
	}

	private loadBottlenecks(): void {
		const bottlenecks = bottlenecksConfig;
		bottlenecks.forEach((bottleneck) => {
			const newBottleneck = new BottleNeck(bottleneck.id, bottleneck.position.lon, bottleneck.position.lat, bottleneck.capacity);
			this.bottlenecks.push(newBottleneck);
			this.bottleneckLayer.add(newBottleneck);
		});
	}


	private createGraph(): any {
		// Create a graph from the map data
	}

	private updateGraph(time: number): any {
		// Check which road segments are flooded (or blocked) and update the graph
	}

	public async createEvacuationRoute(origin: [lon: number, lat: number]): Promise<{ route: Array<RouteFeature>, extractionPoint: ExtractionPoint } | undefined> {
		if (!this.selectedExtractionPoint) {
			return;
		}
		const extractionLocation: [lon: number, lat: number] = [
			this.selectedExtractionPoint.lon,
			this.selectedExtractionPoint.lat
		]
		const route = await this.routingAPI.getRoute(origin, extractionLocation);
		// determine the route

		// check for bottlenecks, and update the capacity of overlapping bottlenecks

		// if impossible, update the graph, and recalculate the route (??)
		return {
			route: route.features,
			extractionPoint: this.selectedExtractionPoint
		};
	}

	public updateBottleneckCapacities(evacuations: Array<Evacuation>): void {

	}


	public onLeftClick(picked: any): void {
		// if extraction point is clicked, set it as the selected extraction point
		if (picked.id instanceof Cesium.Entity) {
			const extractionPoint = this.extractionPoints.find((ep) => ep.entity === picked.id);
			if (extractionPoint) {
				this.selectedExtractionPoint = extractionPoint;
			}
		}
	}
}
