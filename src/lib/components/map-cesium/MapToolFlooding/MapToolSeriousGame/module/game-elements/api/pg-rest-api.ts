import { PGRestClient } from "@sogelink-research/pgrest-client";
import { writable, type Writable } from "svelte/store";


const PGREST_URL = "https://datacore.beta.geodan.nl/pgrest/";
const PGREST_CLIENT_ID = "";
const PGREST_CLIENT_SECRET = "";
const PGREST_CONNECTION = "default";


export interface CBSHexagon {
	hex: string;
	population: number;
}

export interface FloodHexagon {
	hex: string;
	maxFloodDepth: number;
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
	public async getCBSHexagons(polygon: Array<[lon: number, lat: number]>, resolution: number): Promise<Array<CBSHexagon>> {
		const query = `
			SELECT
				h3_cell_to_parent(h3::h3index, ${resolution}) AS parent_h3,
				SUM(number_of_inhabitants) AS population
			FROM
				datacore.cbs_h3
			WHERE number_of_inhabitants > 0
			AND ST_Intersects(
				centroid,
				ST_GeomFromGeoJSON('{
					"type":"Polygon",
					"coordinates": [${JSON.stringify(polygon)}]
				}')
			)
			GROUP BY parent_h3;
		`;
		const queryResult: any = await this.client.query(query, {
			format: "jsonDataArray"
		});
		const hexagons: Array<CBSHexagon> = queryResult.data.rows.map((rows: any) => {
			return {
				hex: rows[0],
				population: rows[1] ?? 0
			}
		});
		return hexagons;
	}

	public async getFloodHexagons(polygon: Array<[lon: number, lat: number]>, resolution: number, scenarios: Array<string>, time: number): Promise<Array<FloodHexagon>> {
		const query = `
			SELECT
				h3_cell_to_parent(h3, ${resolution}) AS parent_h3,
				MAX(flood_depth) AS max_flood_depth
			FROM
				datacore.zeeland_flood_h3
				WHERE scenario = ANY(ARRAY[${scenarios.map(s => `'${s}'`).join(',')}])
				AND timestep = ${time * 6}
				AND flood_depth > 0.03
				AND ST_Intersects(
					ST_SetSRID(centroid, 4326),
					ST_GeomFromGeoJSON('{
						"type":"Polygon",
						"coordinates": [${JSON.stringify(polygon)}]
					}')
				)
			GROUP BY parent_h3;
		`;
		const queryResult: any = await this.client.query(query, {
			format: "jsonDataArray"
		});
		const hexagons: Array<FloodHexagon> = queryResult.data.rows.map((rows: any) => {
			return {
				hex: rows[0],
				maxFloodDepth: rows[1] ?? 0
			}
		});
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
