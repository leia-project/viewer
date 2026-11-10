/* Het resultaat van een backend-tool (een "artifact") als tabel: SQL-rijen,
   GeoJSON-features of zoekresultaten. */

export type Row = Record<string, unknown>;

export function artifactRows(content: any): Row[] {
	if (Array.isArray(content?.rows)) return content.rows;
	if (Array.isArray(content?.features)) return content.features.map((f: any) => f.properties ?? {});
	if (Array.isArray(content?.results)) return content.results;
	return [];
}

/* Alle kolommen die in minstens één rij voorkomen, in volgorde van opduiken. */
export const artifactColumns = (rows: Row[]) => [...new Set(rows.flatMap((row) => Object.keys(row)))];

export function artifactCaption(content: any, rowCount: number): string {
	const source = content?.queried_table ?? content?.type_name ?? content?.query;
	const count = content?.feature_count ?? rowCount;
	return source ? `${count} resultaten · ${source}` : `${count} resultaten`;
}

export function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "–";
	return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/* Eén tekstargument (meestal de SQL) los tonen, anders alles als JSON. */
export function argsPreview(args: unknown): string {
	if (typeof args === "string") return args;
	if (!args || typeof args !== "object") return "";
	const values = Object.values(args);
	return values.length === 1 && typeof values[0] === "string" ? values[0] : JSON.stringify(args, null, 2);
}
