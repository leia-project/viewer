import { XMLParser } from "fast-xml-parser";

export interface GeographicBoundingBox {
	west: number;
	south: number;
	east: number;
	north: number;
}

export interface CapabilitiesLayer {
	id: string;
	text: string;
	formats: Array<string>;
	boundingBox?: GeographicBoundingBox;
}

const capabilitiesCache = new Map<string, Array<CapabilitiesLayer>>();
const inFlightCapabilitiesRequests = new Map<string, Promise<Array<CapabilitiesLayer>>>();
const documentCache = new Map<string, Promise<any>>();


function getCacheKey(baseUrl: string, type: "wms" | "wmts"): string {
	return `${type}|${baseUrl.trim()}`;
}


function cloneLayers(layers: Array<CapabilitiesLayer>): Array<CapabilitiesLayer> {
	return layers.map((layer) => ({
		...layer,
		formats: [...layer.formats],
		boundingBox: layer.boundingBox ? { ...layer.boundingBox } : undefined
	}));
}


/**
 * Builds a GetCapabilities URL for a WMS/WMTS service. Strips any query params
 * from the base URL that would conflict (e.g. a leftover `service=WMS` that
 * strict servers like GeoServer reject as a duplicate). Optional `namespace`
 * restricts the response to one workspace on servers that support it.
 */
export function buildGetCapabilitiesUrl(
	baseUrl: string,
	type: "wms" | "wmts",
	namespace?: string
): string {
	const [path, query = ""] = baseUrl.split("?");
	const params = new URLSearchParams(query);
	// Remove request-defining and GetMap/GetTile-specific params (case-insensitive).
	const dropKeys = new Set([
		"service", "request", "version", "format", "styles", "style", "transparent",
		"layers", "layer", "bbox", "width", "height", "srs", "crs", "tilematrix",
		"tilematrixset", "tilerow", "tilecol", "namespace"
	]);
	for (const key of [...params.keys()]) {
		if (dropKeys.has(key.toLowerCase())) params.delete(key);
	}
	params.set("service", type);
	params.set("request", "GetCapabilities");
	if (namespace) params.set("namespace", namespace);
	return `${path}?${params.toString()}`;
}


function toArray<T>(value: T | Array<T> | undefined): Array<T> {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}


function toNumber(value: unknown): number | undefined {
	const num = typeof value === "number" ? value : Number(value);
	return Number.isFinite(num) ? num : undefined;
}


/** Reads a lon/lat bbox from a WMS layer node: EX_GeographicBoundingBox (1.3.0), else LatLonBoundingBox (1.1.1). */
function boundingBoxFromLayerNode(layer: any): GeographicBoundingBox | undefined {
	const ex = layer.EX_GeographicBoundingBox;
	if (ex) {
		const west = toNumber(ex.westBoundLongitude);
		const east = toNumber(ex.eastBoundLongitude);
		const south = toNumber(ex.southBoundLatitude);
		const north = toNumber(ex.northBoundLatitude);
		if (west !== undefined && east !== undefined && south !== undefined && north !== undefined) {
			return { west, south, east, north };
		}
	}

	const latLon = toArray(layer.LatLonBoundingBox)[0] as any;
	if (latLon) {
		const west = toNumber(latLon.minx);
		const east = toNumber(latLon.maxx);
		const south = toNumber(latLon.miny);
		const north = toNumber(latLon.maxy);
		if (west !== undefined && east !== undefined && south !== undefined && north !== undefined) {
			return { west, south, east, north };
		}
	}

	return undefined;
}


/** Reads a lon/lat bbox from a WMTS/OWS layer node's WGS84BoundingBox (LowerCorner/UpperCorner, "lon lat"). */
function boundingBoxFromWgs84BoundingBox(layer: any): GeographicBoundingBox | undefined {
	const wgs84 = toArray(layer.WGS84BoundingBox)[0] as any;
	if (!wgs84) return undefined;
	const lower = String(wgs84.LowerCorner ?? "").trim().split(/\s+/);
	const upper = String(wgs84.UpperCorner ?? "").trim().split(/\s+/);
	if (lower.length !== 2 || upper.length !== 2) return undefined;
	const west = toNumber(lower[0]);
	const south = toNumber(lower[1]);
	const east = toNumber(upper[0]);
	const north = toNumber(upper[1]);
	if (west !== undefined && east !== undefined && south !== undefined && north !== undefined) {
		return { west, south, east, north };
	}
	return undefined;
}


function createParser(): XMLParser {
	return new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "",
		textNodeName: "#text",
		trimValues: true,
		parseTagValue: false,
		parseAttributeValue: false,
		removeNSPrefix: true
	});
}


/**
 * Fetches and parses a GetCapabilities document to raw XML, cached per URL and
 * de-duplicated in flight so all consumers share one request. Failed fetches
 * are evicted so they can be retried.
 */
export function fetchCapabilitiesDocument(url: string): Promise<any> {
	let cached = documentCache.get(url);
	if (!cached) {
		cached = (async () => {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const xmlText = await response.text();
			return createParser().parse(xmlText);
		})().catch((error) => {
			documentCache.delete(url);
			throw error;
		});
		documentCache.set(url, cached);
	}
	return cached;
}


/**
 * Returns the selectable layers (id, title, formats, bbox) from a WMS/WMTS
 * service's GetCapabilities. Empty array on failure so callers can fall back to
 * manual entry.
 */
export async function fetchCapabilitiesLayers(
	baseUrl: string,
	type: "wms" | "wmts"
): Promise<Array<CapabilitiesLayer>> {
	const cacheKey = getCacheKey(baseUrl, type);
	const cachedLayers = capabilitiesCache.get(cacheKey);
	if (cachedLayers) {
		return cloneLayers(cachedLayers);
	}

	const inFlightRequest = inFlightCapabilitiesRequests.get(cacheKey);
	if (inFlightRequest) {
		return inFlightRequest;
	}

	const request = (async () => {
		try {
			const parsedXml = await fetchCapabilitiesDocument(buildGetCapabilitiesUrl(baseUrl, type));
			if (!parsedXml) return [];
			const layers = type === "wms" ? parseWmsLayers(parsedXml) : parseWmtsLayers(parsedXml);
			capabilitiesCache.set(cacheKey, cloneLayers(layers));
			return cloneLayers(layers);
		} catch (error) {
			console.error(`Error fetching ${type.toUpperCase()} GetCapabilities:`, error);
			return [];
		} finally {
			inFlightCapabilitiesRequests.delete(cacheKey);
		}
	})();

	inFlightCapabilitiesRequests.set(cacheKey, request);
	return request;
}


function parseWmsLayers(parsedXml: any): Array<CapabilitiesLayer> {
	// WMS 1.3.0 uses WMS_Capabilities, WMS 1.1.1 uses WMT_MS_Capabilities
	const capabilities = parsedXml.WMS_Capabilities ?? parsedXml.WMT_MS_Capabilities;
	if (!capabilities?.Capability) return [];

	const formats = toArray<string>(capabilities.Capability.Request?.GetMap?.Format);

	const layers: Array<CapabilitiesLayer> = [];
	const walk = (layer: any, inheritedBoundingBox?: GeographicBoundingBox) => {
		if (!layer) return;
		// WMS layers inherit their ancestors' geographic bounding box, so a named
		// layer without its own box falls back to the nearest ancestor's box.
		const boundingBox = boundingBoxFromLayerNode(layer) ?? inheritedBoundingBox;
		// Only layers with a Name are requestable; group layers without a Name are skipped
		if (layer.Name) {
			layers.push({
				id: String(layer.Name),
				text: layer.Title ? String(layer.Title) : String(layer.Name),
				formats,
				boundingBox
			});
		}
		toArray(layer.Layer).forEach((child) => walk(child, boundingBox));
	};
	toArray(capabilities.Capability.Layer).forEach((layer) => walk(layer));
	return disambiguateLayers(layers);
}


function parseWmtsLayers(parsedXml: any): Array<CapabilitiesLayer> {
	const capabilities = parsedXml.Capabilities;
	if (!capabilities?.Contents) return [];

	const layers = toArray<any>(capabilities.Contents.Layer)
		.filter((layer) => layer?.Identifier)
		.map((layer) => ({
			id: String(layer.Identifier),
			text: layer.Title ? String(layer.Title) : String(layer.Identifier),
			formats: toArray<string>(layer.Format),
			boundingBox: boundingBoxFromWgs84BoundingBox(layer)
		}));
	return disambiguateLayers(layers);
}


/** Appends the unique Name in parentheses to any layer whose Title is shared by another, for a distinguishable dropdown. */
function disambiguateLayers(layers: Array<CapabilitiesLayer>): Array<CapabilitiesLayer> {
	const titleCounts = new Map<string, number>();
	for (const layer of layers) {
		titleCounts.set(layer.text, (titleCounts.get(layer.text) ?? 0) + 1);
	}
	return layers.map((layer) =>
		(titleCounts.get(layer.text) ?? 0) > 1 && layer.text !== layer.id
			? { ...layer, text: `${layer.text} (${layer.id})` }
			: layer
	);
}


/** Picks the best output format from a GetCapabilities list, preferring PNG, then JPEG, then any image type. */
export function pickPreferredFormat(formats: Array<string>): string | undefined {
	if (formats.length === 0) return undefined;
	const normalized = formats.map((format) => ({
		raw: format,
		lower: format.toLowerCase()
	}));
	return (
		normalized.find((f) => f.lower === "image/png")?.raw ??
		normalized.find((f) => f.lower.includes("png"))?.raw ??
		normalized.find((f) => f.lower.includes("jpeg") || f.lower.includes("jpg"))?.raw ??
		normalized.find((f) => f.lower.startsWith("image/"))?.raw ??
		undefined
	);
}


/**
 * Returns a WMS/WMTS layer's bbox (by featureName/identifier) from GetCapabilities,
 * or undefined. Reuses the cached fetchCapabilitiesLayers. featureName may be a
 * comma-separated list; the first part with a bbox wins.
 */
export async function fetchLayerBoundingBox(
	baseUrl: string,
	featureName: string,
	type: "wms" | "wmts"
): Promise<GeographicBoundingBox | undefined> {
	if (!baseUrl || !featureName) return undefined;
	const layers = await fetchCapabilitiesLayers(baseUrl, type);
	if (layers.length === 0) return undefined;
	for (const part of featureName.split(",").map((name) => name.trim())) {
		const match = layers.find((layer) => layer.id === part);
		if (match?.boundingBox) return match.boundingBox;
	}
	return undefined;
}
