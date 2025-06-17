import { calculateRoute } from "./routing/calculateroute";
import { PGRestAPI } from "./pg-rest-api";
import { disableGraphEdges, resetGraphToDefault } from "./routing/graph";
//import { Network } from "./routing/network";


export interface RouteFeature {
	type: "Feature";
	geometry: {
		type: "LineString";
		coordinates: Array<[lon: number, lat: number]>;
	};
	properties: {
		fid: string;
		maximum_snelheid: number;
		capaciteit: number;
		cost: number;
		length: number;
		routeCost: number;
		routeFrom: string | number;
		routeLength: number;
		routeTo: string | number;
		source: string | number;
		sourceIndex: number;
		target: string | number;
		targetIndex: number;
	};
	bbox: [number, number, number, number];
}

export class RoutingAPI extends PGRestAPI {

	private floodedSegments: Array<string> = [];
	private overloadedSegments: Array<string> = [];

	constructor() {
		super();
	}

	public async getRoute(startPoint: [lon: number, lat: number], endPoint: [lon: number, lat: number]): Promise<{ type: string, features: Array<RouteFeature> }> {
		const maxDistance = 15000; // meters
		const route = await calculateRoute("zeeland_datacore", "car", startPoint, endPoint, [...this.floodedSegments, ...this.overloadedSegments], maxDistance);
		return route;
	}

	public removeSegments(segments: Array<string>): void {
		disableGraphEdges("zeeland_datacore", "car", segments, "fid");
		for (const segment of segments) {
			if (!this.overloadedSegments.includes(segment)) {
				this.overloadedSegments.push(segment);
			}
		}
	}

	public resetGraph(): void {
		resetGraphToDefault("zeeland_datacore", "car");
	}

	public async createGraph(geojson: string): Promise<void> {
		//const network = new Network("zeeland_new", "car");
		
	}

	public onTimeUpdate(floodedSegments: Array<string>, overloadedSegments: Array<string>): void {
		this.floodedSegments = floodedSegments;
		this.overloadedSegments = overloadedSegments;
		// Update the graph with the new flooded and overloaded segments
		this.resetGraph();
		this.removeSegments(floodedSegments);
		this.removeSegments(overloadedSegments);
	}
	
}