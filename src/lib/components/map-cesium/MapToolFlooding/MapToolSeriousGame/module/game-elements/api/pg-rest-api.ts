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
	public async getHexagons(polygon: {type: string, coordinates: Array<Array<[lon: number, lat: number]>>}, resolution: number): Promise<Array<HexagonEntry>> {
		let query = `
			SELECT h3, number_of_inhabitants FROM datacore.zeeland_h3
		`;

		if (polygon) {
			query += `
				WHERE ST_Intersects(
					centroid,
					ST_GeomFromGeoJSON('${JSON.stringify(polygon)}')
				)
			`;
		}

		const queryResult: any = await this.client.query(query, {
			format: "jsonDataArray"
		});

	    const rows = queryResult.data.rows;
		const aggregation = new Map<string, number>();

		for (const row of rows) {
			const cell = row[0];
			const population = row[1] ?? 0;
			const cellRes = getResolution(cell);
			let parentCell: string;
			if (resolution < cellRes) {
				parentCell = cellToParent(cell, resolution);
			} else if (resolution === cellRes) {
				parentCell = cell;
			} else {
				// If target resolution is higher (finer), skip for now (unlikely case)
				continue;
			}

			aggregation.set(parentCell, (aggregation.get(parentCell) ?? 0) + population);
		}

		const hexagons: Array<HexagonEntry> = Array.from(aggregation, ([hex, population]) => ({ hex, population }));

		return hexagons;
	}

}
