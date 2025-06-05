import type { Map } from "$lib/components/map-cesium/module/map";
import { ExtractionPoint, BottleNeck, RoadNetworkLayer } from "./bottle-neck";
import { Evacuation } from "../evacuation";
import type { Hexagon } from "../hexagons/hexagon";


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

	private graph: any;
	private extractionPoints: Array<ExtractionPoint> = [];
	private exctractionPointLayer: RoadNetworkLayer<ExtractionPoint>;
	public selectedExtractionPoint: any;
	private bottlenecks: Array<BottleNeck> = [];
	private bottleneckLayer: RoadNetworkLayer<BottleNeck>;
	private blockedSegments: Array<any> = [];

	public evacuations: Array<any> = [];

	constructor(map: Map) {
		this.graph = this.createGraph();
		this.exctractionPointLayer = new RoadNetworkLayer<ExtractionPoint>(map);
		this.bottleneckLayer = new RoadNetworkLayer<BottleNeck>(map);
		this.init();
	}

	private init(): void {
		this.loadExtractionPoints();
		this.loadBottlenecks();
	}

	private loadExtractionPoints(): void {
		const extractionPoints = extractionPointsConfig;
		extractionPoints.forEach((point) => {
			const extractionPoint = new ExtractionPoint(point.id, point.position.lon, point.position.lat);
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


	private createGraph(): any {
		// Create a graph from the map data
	}

	private route(start: any, end: any): Array<any> {
		// determine the route

		// check for bottlenecks

		// if impossible, update the graph, and recalculate the route (??)
		return [];
	}

	public createEvacuation(hexagon: Hexagon, extractionPoint: ExtractionPoint): Evacuation | undefined {
		const route = this.route(hexagon.center, extractionPoint);
		if (route.length === undefined) {
			// handle no route found
			return;
		}
		const evacuation = new Evacuation(route, hexagon, extractionPoint);
		this.evacuations.push(evacuation);
		return evacuation;
	}

	public removeEvacuation(evacuation: Evacuation): void {
		this.evacuations = this.evacuations.filter((e) => e !== evacuation);
		// update bottleneck capacities
	}

	public updateBottleneckCapacities(): void {

	}

}
