import { BottleNeckLayer, ExtractionPoint, type BottleNeck } from "./bottle-neck";
import { Evacuation } from "./evacuation";
import type { Hexagon } from "./hexagon";


export class RoadNetwork {

	private graph: any;
	private extractionPoints: Array<ExtractionPoint> = [];
	public selectedExtractionPoint: any;
	private bottlenecks: Array<BottleNeck> = [];
	private bottleneckLayer: BottleNeckLayer = new BottleNeckLayer();
	private blockedSegments: Array<any> = [];

	public evacuations: Array<any> = [];

	constructor() {
		this.graph = this.createGraph();
	}

	private loadExtractionPoints(): void {

	}

	private loadBottlenecks(): void {
		// Load bottlenecks from the server or local storage

		// Update layer
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
