import { writable, type Writable } from "svelte/store";
import { calculateRoute } from "./routing/calculateroute";
import { PGRestAPI } from "./pg-rest-api";


export interface RouteFeature {
	type: "Feature";
	geometry: {
		type: "LineString";
		coordinates: Array<[number, number]>; // [lon, lat]
	};
	properties: {
		id: string;
		length: number;
		routeCost: number;
		routeFrom: string;
		routeLength: number;
		routeMode: string;
		routeTo: string | number;
		source: string;
		sourceIndex: number;
		target: string | number;
		targetIndex: number;
		wvk_id: number;
	};
}

export class RoutingAPI extends PGRestAPI {

	private time: Writable<number> = writable(0);

	constructor() {
		super();
		/* this.time.subscribe((time: number) => {
			// Update the routing API with the current time
			this.updateGraph(time);
		}); */
	}

	public async getRoute(startPoint: [lon: number, lat: number], endPoint: [lon: number, lat: number]): Promise<{ type: string, features: Array<RouteFeature> }> {
		const route = await calculateRoute('zeeland', 'car', startPoint, endPoint);
		console.log("Route:", route);
		return route;
	}

	public updateFloodedSegments(time: number): void {

	}

	/* private setFloodedSegments(): Array<any> {
		let query = `
			SELECT h3, number_of_inhabitants FROM datacore.zeeland_h3 LIMIT 10;
		`;

		if (polygon) {
			query += `
				WHERE ST_Intersects(
					geom,
					ST_MakeEnvelope(${polygon}, 4326)
				)
			`;
		}

		const queryResult: any = await this.client.query(query, {
			format: "jsonDataArray"
		});

	}
 */
	// get flooded segments, and remove them

	// remove node


	
}