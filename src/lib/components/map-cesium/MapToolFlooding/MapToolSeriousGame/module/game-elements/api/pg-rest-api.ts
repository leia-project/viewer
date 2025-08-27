import { PGRestClient } from "@sogelink-research/pgrest-client";


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
	private schema = "datacore";
	private tables = {
		cbs_h3: "cbs_h3",
		zeeland_flood_h3: "zeeland_flood_h3",
		zeeland_road_network: "zeeland_road_network"
	}

	constructor() {
		if (!PGREST_CLIENT_ID || !PGREST_CLIENT_SECRET) {
			throw new Error("PGREST_CLIENT_ID and PGREST_CLIENT_SECRET must be set in environment variables.");
		}
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
				${this.schema}.${this.tables.cbs_h3}
			WHERE number_of_inhabitants > 0
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
		const hexagons: Array<CBSHexagon> = queryResult.data.rows.map((rows: any) => {
			return {
				hex: rows[0],
				population: rows[1]
			}
		});
		return hexagons;
	}

	public async getFloodHexagons(polygon: Array<[lon: number, lat: number]>, resolution: number, scenarios: Array<string>, time: number): Promise<Array<FloodHexagon>> {
		const query = `
			SELECT
				h3_cell_to_parent(h3, ${resolution}) AS parent_h3,
				MAX(flood_depth) AS max_flood_depth,
				COUNT(*) AS pixel_count
			FROM
				${this.schema}.${this.tables.zeeland_flood_h3}
				WHERE scenario = ANY(ARRAY[${scenarios.map(s => `'${s}'`).join(',')}])
				AND timestep = ${Math.ceil(time) * 6}
				--AND flood_depth > 0.02 // Hexagons with depths < 0.02 are already deleted in the database
				AND ST_Intersects(
					ST_SetSRID(centroid, 4326),
					ST_GeomFromGeoJSON('{
						"type":"Polygon",
						"coordinates": [${JSON.stringify(polygon)}]
					}')
				)
			GROUP BY parent_h3
			HAVING COUNT(*) >= 100;
		`;
		const queryResult: any = await this.client.query(query, {
			format: "jsonDataArray"
		});
		const hexagons: Array<FloodHexagon> = queryResult.data.rows.map((rows: any) => {
			return {
				hex: rows[0],
				maxFloodDepth: rows[1]
			}
		});
		return hexagons;
	}

	public async getRoadNetworkEdges(polygon: Array<[lon: number, lat: number]>): Promise<any> {
		const query = `
			SELECT 
				jsonb_build_object(
					'type', 'FeatureCollection',
					'features', jsonb_agg(
						jsonb_build_object(
							'type', 'Feature',
							'geometry', ST_AsGeoJSON(geom)::jsonb,
							'properties', to_jsonb(r) - 'geom'
						)
					)
				)
			FROM (
				SELECT fid, name, geom, source, target, capaciteit, maximum_snelheid, cost, reverse_cost, wvk_ids
				FROM ${this.schema}.${this.tables.zeeland_road_network}
				WHERE ST_Intersects(
					geom,
					ST_GeomFromGeoJSON('{
						"type":"Polygon",
						"coordinates": [${JSON.stringify(polygon)}]
					}')
				)
			) AS r;
		`;
		try {
			const queryResult: any = await this.client.query(query, {
				format: "json"
			});
			return queryResult.data[0].jsonb_build_object;
		} catch (error) {
			// If the error is likely due to a bad polygon, try splitting it in two and merging results
			if (polygon.length > 4) {
				const mid = Math.floor(polygon.length / 2);
				const poly1 = polygon.slice(0, mid + 1);
				const poly2 = [polygon[0], ...polygon.slice(mid)];
				const [result1, result2] = await Promise.all([
					this.getRoadNetworkEdges(poly1),
					this.getRoadNetworkEdges(poly2)
				]);
				// Combine features from both results, removing duplicates by fid
				const features1 = result1?.features ?? [];
				const features2 = result2?.features ?? [];
				const seen = new Set();
				const combined = [...features1, ...features2].filter(f => {
					const fid = f.properties?.fid;
					if (seen.has(fid)) return false;
					seen.add(fid);
					return true;
				});
				return {
					type: "FeatureCollection",
					features: combined
				};
			} else {
				throw error;
			}
		}
	}

	public async getRoadNetworkGraph(polygon: Array<[lon: number, lat: number]>): Promise<any> {
		const whereClause = `
			WHERE ST_Intersects(
				geom,
				ST_GeomFromGeoJSON('{
					"type":"Polygon",
					"coordinates": [${JSON.stringify(polygon)}]
				}')
			)`;
		const query = `
			WITH 
			-- Collect outgoing connections (source → target with cost)
			outgoing_connections AS (
				SELECT 
					source AS node_id,
					target AS connected_node,
					cost AS connection_cost
				FROM ${this.schema}.${this.tables.zeeland_road_network}
				${whereClause}
			),

			-- Collect incoming connections (target ← source with reverse_cost)
			incoming_connections AS (
				SELECT 
					target AS node_id,
					source AS connected_node,
					reverse_cost AS connection_cost
				FROM ${this.schema}.${this.tables.zeeland_road_network}
				${whereClause}
			),

			-- Union the connections
			all_connections AS (
				SELECT * FROM outgoing_connections
				UNION ALL
				SELECT * FROM incoming_connections
			),

			-- For each node, create an object with connected nodes as keys and costs as values
			node_connection_objects AS (
				SELECT
					node_id,
					jsonb_object_agg(
					connected_node::text, 
					connection_cost
					) AS connections
				FROM all_connections
				GROUP BY node_id
			)

			-- Create the final JSON object with all nodes
			SELECT
				jsonb_object_agg(
					node_id::text, 
					connections
				) AS network
			FROM node_connection_objects;
		`;
		const queryResult: any = await this.client.query(query, {
			format: "json"
		});
		return queryResult.data[0].network;
	}
	
	public async getFloodedRoadSegments(time: number): Promise<Array<[string, number]>> {
		// We use the flooded roads service of Zeeland to get the flooded road segments.
		return [];
		let query = `
			SELECT fid, flood_height FROM datacore.zeeland_roads a
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
