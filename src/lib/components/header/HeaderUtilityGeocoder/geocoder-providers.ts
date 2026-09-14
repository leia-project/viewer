// @ts-ignore
import { Wkt } from "wicket";
import { getFeatureBounds } from "$lib/map-cesium/utils/map-utils";

export type GeocoderBounds = Array<number>;

export interface GeocoderSuggestion {
	text: string;
	description?: string;
	providerId: string;
	payload: any;
}

export interface GeocoderProvider {
	id: string;
	defaultUrl: string;
	labelKey: string;
	requiresDebounce?: boolean;
	suggest(
		query: string,
		url: string,
		limit: number,
		signal: AbortSignal
	): Promise<Array<GeocoderSuggestion>>;
	resolveBounds(payload: any, url: string): Promise<GeocoderBounds | undefined>;
}

export const PER_PROVIDER_LIMIT = 5;
export const TOTAL_RESULT_LIMIT = 10;

export function wktToBox(wkt: string): GeocoderBounds {
	const geom = new Wkt(wkt);
	const geoJson = geom.toJson();
	return getFeatureBounds(geoJson);
}

const locatieserverProvider: GeocoderProvider = {
	id: "locatieserver",
	defaultUrl: "https://api.pdok.nl/bzk/locatieserver/search/v3_1",
	labelKey: "tools.geocoder.providers.locatieserver",
	async suggest(query, url, limit, signal) {
		const result = await fetch(
			`${url}/suggest?wt=json&q=${encodeURIComponent(query)}&rows=${limit}`,
			{ signal }
		);
		const searchResults = await result.json();

		return (searchResults?.response?.docs ?? []).map((searchResult: any) => ({
			text: searchResult.weergavenaam,
			providerId: "locatieserver",
			payload: searchResult.id
		}));
	},
	async resolveBounds(payload, url) {
		const result = await fetch(
			`${url}/lookup?wt=json&id=${encodeURIComponent(payload)}&fl=geometrie_ll`
		);
		const lookupResult = await result.json();

		if (lookupResult?.response?.docs?.length > 0) {
			return wktToBox(lookupResult.response.docs[0].geometrie_ll);
		}
		return undefined;
	}
};

const nominatimProvider: GeocoderProvider = {
	id: "nominatim",
	defaultUrl: "https://nominatim.openstreetmap.org",
	labelKey: "tools.geocoder.providers.nominatim",
	requiresDebounce: true,
	async suggest(query, url, limit, signal) {
		const result = await fetch(
			`${url}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`,
			{ signal }
		);
		const searchResults = await result.json();

		return (searchResults ?? []).map((searchResult: any) => ({
			text: searchResult.display_name,
			providerId: "nominatim",
			payload: searchResult.osm_type.charAt(0).toUpperCase() + searchResult.osm_id
		}));
	},
	async resolveBounds(payload, url) {
		const result = await fetch(`${url}/lookup?format=json&osm_ids=${payload}`);
		const lookupResults = await result.json();
		const bbox = lookupResults?.[0]?.boundingbox;

		if (bbox) {
			return [parseFloat(bbox[2]), parseFloat(bbox[0]), parseFloat(bbox[3]), parseFloat(bbox[1])];
		}
		return undefined;
	}
};

const geolocationProvider: GeocoderProvider = {
	id: "geolocation",
	defaultUrl: "https://geo.api.vlaanderen.be/geolocation/",
	labelKey: "tools.geocoder.providers.geolocation",
	async suggest(query, url, limit, signal) {
		const result = await fetch(`${url}v4/Location?q=${encodeURIComponent(query)}&c=${limit}`, {
			signal
		});
		const searchResults = await result.json();

		// The geolocation ID cannot be used to look up an address, so the whole result is kept as payload.
		return (searchResults?.LocationResult ?? []).map((searchResult: any) => ({
			text: searchResult.FormattedAddress,
			providerId: "geolocation",
			payload: searchResult
		}));
	},
	async resolveBounds(payload) {
		const bbox = payload?.BoundingBox;
		if (!bbox) return undefined;

		const lowerLeftLat = bbox.LowerLeft.Lat_WGS84;
		const lowerLeftLon = bbox.LowerLeft.Lon_WGS84;
		const upperRightLat = bbox.UpperRight.Lat_WGS84;
		const upperRightLon = bbox.UpperRight.Lon_WGS84;

		const wktString = `POLYGON((${lowerLeftLon} ${lowerLeftLat}, ${lowerLeftLon} ${upperRightLat}, ${upperRightLon} ${upperRightLat}, ${upperRightLon} ${lowerLeftLat}, ${lowerLeftLon} ${lowerLeftLat}))`;
		return wktToBox(wktString);
	}
};

const geoportailLuProvider: GeocoderProvider = {
	id: "geoportail-lu",
	defaultUrl: "https://apiv4.geoportail.lu",
	labelKey: "tools.geocoder.providers.geoportail-lu",
	async suggest(query, url, limit, signal) {
		const result = await fetch(
			`${url}/fulltextsearch?query=${encodeURIComponent(query)}&limit=${limit}&fuzziness=0`,
			{ signal }
		);
		const searchResults = await result.json();

		// The feature already carries its geometry, so it is kept as payload instead of doing a lookup.
		return (searchResults?.features ?? []).map((feature: any) => ({
			text: feature.properties?.label,
			providerId: "geoportail-lu",
			payload: feature
		}));
	},
	async resolveBounds(payload) {
		// Point features return an empty object instead of a bbox array.
		if (Array.isArray(payload?.bbox) && payload.bbox.length === 4) return payload.bbox;
		return payload?.geometry ? getFeatureBounds(payload.geometry) : undefined;
	}
};

export const geocoderProviders: Record<string, GeocoderProvider> = {
	[locatieserverProvider.id]: locatieserverProvider,
	[nominatimProvider.id]: nominatimProvider,
	[geolocationProvider.id]: geolocationProvider,
	[geoportailLuProvider.id]: geoportailLuProvider
};

export function resolveProviders(
	nameSetting: string | Array<string> | undefined
): Array<GeocoderProvider> {
	const names = Array.isArray(nameSetting) ? nameSetting : nameSetting ? [nameSetting] : [];
	const providers = new Array<GeocoderProvider>();

	for (const name of names) {
		if (typeof name !== "string") continue;
		const provider = geocoderProviders[name.trim().toLowerCase()];

		if (!provider) {
			console.warn(`Unknown geocoder: ${name}`);
			continue;
		}
		if (!providers.includes(provider)) providers.push(provider);
	}

	if (providers.length === 0) {
		console.warn("No valid geocoder settings found, using default (locatieserver)");
		providers.push(locatieserverProvider);
	}

	return providers;
}

/** Round-robin interleave; providers that run out yield their slots to the others. */
export function mergeSuggestions(
	perProvider: Array<Array<GeocoderSuggestion>>,
	totalLimit: number
): Array<GeocoderSuggestion> {
	const merged = new Array<GeocoderSuggestion>();
	const longest = perProvider.reduce((max, list) => Math.max(max, list.length), 0);

	for (let i = 0; i < longest && merged.length < totalLimit; i++) {
		for (const list of perProvider) {
			if (merged.length >= totalLimit) break;
			if (i < list.length) merged.push(list[i]);
		}
	}

	return merged;
}
