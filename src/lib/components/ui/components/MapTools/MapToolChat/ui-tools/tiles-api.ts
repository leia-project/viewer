import type { MvtProperty } from "$lib/components/map-cesium/module/layers/mvt-layer";

/* De tile-endpoints van de API waar de assistent mee praat (zie ApiContext). De tiles zelf
   haalt Cesium op; hier staat al het andere. */

export interface ApiContext {
	apiUrl: string;
	userKey: string;
}

export interface TileInfo {
	id: string;
	name: string;
	/* URL-sjabloon (met {z}/{x}/{y}) mét een eigen toegangstoken. Cesium bouwt elk tile-adres
	   alleen uit het sjabloon en kan geen headers meesturen, dus het token zit in de URL: een
	   ondertekend, alleen-lezen token voor déze dataset dat verloopt - nooit de sleutel van de gebruiker. */
	tile_path: string;
	access_expires: number; /* unix-tijd waarop het token verloopt */
	source_layer: string;
	geometry_type: string | null;
	extent: [number, number, number, number] | null;
	feature_count: number;
	properties: (MvtProperty & { non_null: number })[];
}

export type ClassesResponse =
	| { kind: "categorical"; values: { value: string; count: number }[] }
	| { kind: "graduated"; breaks: number[]; min: number; max: number };

export const authHeaders = ({ userKey }: ApiContext) => ({ Authorization: `Bearer ${userKey}` });

async function getJson<T>(api: ApiContext, path: string): Promise<T> {
	const response = await fetch(`${api.apiUrl}${path}`, { headers: authHeaders(api) });
	if (!response.ok) {
		/* De API legt een geweigerd verzoek uit in `detail`. */
		const body = await response.json().catch(() => null);
		throw new Error(typeof body?.detail === "string" ? body.detail : `Verzoek mislukt: ${response.status}`);
	}
	return response.json() as Promise<T>;
}

/* Een nieuw toegangstoken voor de tiles van een dataset; goedkoop, anders dan fetchTileInfo. */
export const fetchTileAccess = (api: ApiContext, datasetId: string) =>
	getJson<{ tile_path: string; access_expires: number }>(api, `/datasets/${encodeURIComponent(datasetId)}/tile-access`);

export const fetchTileInfo = (api: ApiContext, datasetId: string) =>
	getJson<TileInfo>(api, `/datasets/${encodeURIComponent(datasetId)}/tileinfo`);

/* Wat een stijl over de héle dataset moet weten: een tile bevat alleen wat in beeld is. */
export function fetchClasses(
	api: ApiContext,
	datasetId: string,
	property: string,
	kind: "categorical" | "graduated",
	classes?: number
) {
	const query = new URLSearchParams({ property, kind });
	if (classes !== undefined) query.set("classes", String(classes));
	return getJson<ClassesResponse>(api, `/datasets/${encodeURIComponent(datasetId)}/classes?${query}`);
}
