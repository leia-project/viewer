import { PGRestClient } from "@sogelink-research/pgrest-client";
import { writable } from "svelte/store";
import { cellToParent, getResolution } from "h3-js";

import type { Writable } from "svelte/store";

const PGREST_URL = "https://datacore.beta.geodan.nl/pgrest/";
const PGREST_CLIENT_ID = "";
const PGREST_CLIENT_SECRET = "";
const PGREST_CONNECTION = "default";

export interface HexagonEntry {
	hex: string;
	population: number;
}

interface Bbox {
	minLon: number,
	minLat: number,
	maxLon: number,
	maxLat: number
}

export class PGRestAPI {

	private client: PGRestClient;
	private loading: Writable<boolean> = writable<boolean>(false);

	constructor() {
		this.client = new PGRestClient(
			PGREST_URL,
			PGREST_CLIENT_ID,
			PGREST_CLIENT_SECRET,
			PGREST_CONNECTION
		);
	}

	// Default hexagon resolution from datacore table is 10
	public async getHexagons(polygon: Array<[lon: number, lat: number]>, resolution: number, scenarios: Array<string>): Promise<Array<HexagonEntry>> {
		// based on scenarios, join the flood table, and determine the time when the hexagon is flooded

		let query = `
			SELECT h3, number_of_inhabitants FROM datacore.cbs_h3
			WHERE number_of_inhabitants > 0
		`;

		if (polygon) {
			query += `
				AND ST_Intersects(
					centroid,
					ST_GeomFromGeoJSON('{
						"type": "Polygon",
						"coordinates": [[${polygon.map(coord => `[${coord[0]}, ${coord[1]}]`).join(", ")}]]
					}')
				)
			`;
		}
		
		const queryResult: any = await this.client.query(query, {
			format: "jsonDataArray"
		});

	    const rows = queryResult.data.rows;
		const aggregation = new Map<string, number>();

		for (const row of rows) {
			const h3 = row[0];
			const population = row[1] ?? 0;
			const cellRes = getResolution(h3);
			let parentCell: string;
			if (resolution < cellRes) {
				parentCell = cellToParent(h3, resolution);
			} else if (resolution === cellRes) {
				parentCell = h3;
			} else {
				// If target resolution is higher (finer), skip for now (unlikely case)
				continue;
			}

			aggregation.set(parentCell, (aggregation.get(parentCell) ?? 0) + population);
		}

		const hexagons: Array<HexagonEntry> = Array.from(aggregation, ([hex, population]) => ({ hex, population }));
		let maxPopulation = 0;
		for (let i = 0; i < hexagons.length; i++) {
			maxPopulation = Math.max(maxPopulation, hexagons[i].population);
		}	
		return hexagons;
	}


	
	public async getFloodedRoadSegments(time: number): Promise<Array<string>> {
		return [];
		// use outline, scenario and time step
		let query = `
			SELECT fid FROM datacore.zeeland_roads a
				LEFT JOIN datacore.flood_h3 b ON ST_Intersects(
					a.geom,
					b.geom
				)
			;
		`;
		const queryResult: any = await this.client.query(query, {
		   format: "jsonDataArray"
  		});

		return  queryResult.data.rows.map((row: any) => row[0]); 
	}

}
