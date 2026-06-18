import { XMLParser } from "fast-xml-parser";

export interface CapabilitiesLayer {
	id: string;
	text: string;
	formats: Array<string>;
}

const capabilitiesCache = new Map<string, Array<CapabilitiesLayer>>();
const inFlightCapabilitiesRequests = new Map<string, Promise<Array<CapabilitiesLayer>>>();


function getCacheKey(baseUrl: string, type: "wms" | "wmts"): string {
	return `${type}|${baseUrl.trim()}`;
}


function cloneLayers(layers: Array<CapabilitiesLayer>): Array<CapabilitiesLayer> {
	return layers.map((layer) => ({
		...layer,
		formats: [...layer.formats]
	}));
}


/**
 * Builds a GetCapabilities request URL for a WMS or WMTS service, taking into
 * account that the provided base URL may already contain query parameters.
 */
export function buildGetCapabilitiesUrl(baseUrl: string, type: "wms" | "wmts"): string {
	const separator = baseUrl.includes("?") ? (baseUrl.endsWith("?") ? "" : "&") : "?";
	return `${baseUrl}${separator}service=${type}&request=GetCapabilities`;
}


function toArray<T>(value: T | Array<T> | undefined): Array<T> {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
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
 * Fetches and parses the GetCapabilities document for a WMS or WMTS service and
 * returns the list of selectable layers, including their available output formats.
 *
 * Returns an empty array if the request fails or no layers are found, so callers
 * can fall back to manual entry.
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
		const url = buildGetCapabilitiesUrl(baseUrl, type);
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const xmlText = await response.text();
			const parsedXml = createParser().parse(xmlText);
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
	const walk = (layer: any) => {
		if (!layer) return;
		// Only layers with a Name are requestable; group layers without a Name are skipped
		if (layer.Name) {
			layers.push({
				id: String(layer.Name),
				text: layer.Title ? String(layer.Title) : String(layer.Name),
				formats
			});
		}
		toArray(layer.Layer).forEach(walk);
	};
	toArray(capabilities.Capability.Layer).forEach(walk);
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
			formats: toArray<string>(layer.Format)
		}));
	return disambiguateLayers(layers);
}


/**
 * Layers can share the same Title while having different (unique) Names. To keep
 * the dropdown distinguishable, the unique Name is appended in parentheses to any
 * layer whose Title is not unique. Layers with a unique Title keep their clean label.
 */
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


/**
 * Picks the most suitable output format from a list returned by GetCapabilities,
 * preferring PNG, then JPEG, then the first available image format.
 */
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
