<script lang="ts">
	// @ts-ignore
	import { Wkt } from "wicket";
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { getContext, onDestroy } from "svelte";
	import { get, writable } from "svelte/store";
	import { HeaderSearch } from "carbon-components-svelte";
	import { getFeatureBounds } from "$lib/components/map-cesium/module/utils/map-utils";
	import { Number_0 } from "carbon-icons-svelte";

	export let txtPlaceholder = get(_)("tools.geocoder.search");

	const { app } = getContext<any>("page");

	let geocoderName: string;
	let geocoderUrl: string;
	let value = writable<string>();
	let selectedResultIndex = 0;
	let events: any[] = [];
	let results = new Array<any>();
	let debounceTimer: ReturnType<typeof setTimeout>;

	$: map = get(app.map);

	onDestroy(() => {
		clearTimeout(debounceTimer);
	});

	app.map.subscribe((map) => {
		if (map) {
			map.configLoaded.subscribe((loaded: boolean) => {
				if (loaded) {
					let geocoderConfig = map.config.tools.find((t: any) => t.id === "geocoder");

					if (geocoderConfig.enabled) {
						if (geocoderConfig.settings) {
							geocoderName = geocoderConfig.settings.name ? geocoderConfig.settings.name.trim().toLowerCase() : "locatieserver";

							switch (geocoderName) {
								case "nominatim":
									geocoderUrl = "https://nominatim.openstreetmap.org";
									break;
								case "locatieserver":
									geocoderUrl = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
									break;
								case "geolocation":
									geocoderUrl = "https://geo.api.vlaanderen.be/geolocation/";
									break;
								default:
									console.warn("Unknown geocoder");
									break;
							};
							// TODO: Add option for custom geocoder
							if (geocoderConfig.settings.url) {
								geocoderUrl = geocoderConfig.settings.url;
								console.warn('Custom geocoder URL is not yet supported');
							}
						}
						// Default geocoder
						else {
							console.warn("No geocoder settings found, using default (locatieserver)");
							geocoderName = "locatieserver";
							geocoderUrl = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
						}
					}
				}
			});
		}
	});

	value.subscribe((v) => {
		if (v && v.length >= 1) {
			if (geocoderName === "nominatim") {
				// Set a new timer that will call geosearch after 1500ms
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					geosearch(v, geocoderName);
				}, 1500);
			} 
			else {
				// For other geocoders, perform search immediately
				geosearch(v, geocoderName);
			}
		} else {
			results = new Array<any>();
		}
	});

	function select(entity: any, geocoder: string): void {
		const id = entity?.selectedResult?.locationId;

		if (id) {
			zoomTo(id, geocoder);
		}
	}

	async function geosearch(query: string, geocoder: string): Promise<void> {
		try {
			let searchResults;
			let entries = new Array<any>();

			if (geocoder === "nominatim") {
				//TODO: Only fire request when no new character is typed within 2000ms
				const result = await fetch(`${geocoderUrl}/search?format=json&q=${query}`);
				searchResults = await result.json();
				
				searchResults.forEach((searchResult: any) => {
					entries.push({
						text: searchResult.display_name,
						locationId: searchResult.osm_type.charAt(0).toUpperCase() + searchResult.osm_id
					});
				});
			} else if (geocoder === "locatieserver") {
				const result = await fetch(`${geocoderUrl}/suggest?wt=json&q=${query}`);
				searchResults = await result.json();
				
				searchResults.response.docs.forEach((searchResult: any) => {
					entries.push({
						text: searchResult.weergavenaam,
						locationId: searchResult.id
					});
				});
			// Try Pijkestraat 140
			} else if (geocoder === "geolocation") {
				const result = await fetch(`${geocoderUrl}v4/Location?q=${query}&c=5`);
				searchResults = await result.json();
				
				searchResults.LocationResult.forEach((searchResult: any) => {
					// geolocation ID cannot be used to return adressess, we need the whole object
					entries.push({
						text: searchResult.FormattedAddress,
						locationId: searchResult
					});
				});
			}
			results = entries;
		} catch (e) {
			console.log(`${geocoder} geocoder`, `Error getting suggest (${e})`);
		}
	};

	async function zoomTo(locationId: string | object, geocoder: string): Promise<void> {
		try {
			if (geocoder === "nominatim") {
				const result = await fetch(`${geocoderUrl}/lookup?format=json&osm_ids=${locationId}`);
				const lookupResults = await result.json();
				const firstLookupResult = lookupResults[0];

				if (firstLookupResult) {
					const bbox = firstLookupResult.boundingbox;
					const box = [parseFloat(bbox[2]), parseFloat(bbox[0]), parseFloat(bbox[3]), parseFloat(bbox[1])];
					setCameraView(box);
				}
			}
			else if (geocoder === "locatieserver") {
				const result = await fetch(`${geocoderUrl}/lookup?wt=json&id=${locationId}&fl=geometrie_ll`);
				const lookupResult = await result.json();

				if (lookupResult?.response?.docs?.length > 0) {
					const geomLL = lookupResult.response.docs[0].geometrie_ll;
					const box = wktToBox(geomLL);
					setCameraView(box);
				}
			}
			else if (geocoder === "geolocation") {
				if (locationId) {
					//check if type of locationId is object, since this already contains the geometry
					if (typeof locationId === 'object') {
						// @ts-ignore
						const geomLL = locationId.BoundingBox;

						const lowerLeftLat = geomLL.LowerLeft.Lat_WGS84;
						const lowerLeftLon = geomLL.LowerLeft.Lon_WGS84;
						const upperRightLat = geomLL.UpperRight.Lat_WGS84;
						const upperRightLon = geomLL.UpperRight.Lon_WGS84;

						// Create a WKT polygon string
						const wktString = `POLYGON((${lowerLeftLon} ${lowerLeftLat}, ${lowerLeftLon} ${upperRightLat}, ${upperRightLon} ${upperRightLat}, ${upperRightLon} ${lowerLeftLat}, ${lowerLeftLon} ${lowerLeftLat}))`;
						const box = wktToBox(wktString);
						setCameraView(box);
					} 
					else {
						console.log("Expected locationId to be of object type. Type retrieved:", typeof locationId);
					}
				}
			}
		} catch (e) {
			console.log(`${geocoder}: Error getting lookup (${e})`);
		}
	}

	function wktToBox(wkt: string): Array<number> {
		const geom = new Wkt(wkt);
		const geoJson = geom.toJson();
		return getFeatureBounds(geoJson);
	}

	function setCameraView(box: Array<number>) {
		// Point box is zooming in too far because result was probably a point, increase
		// bounds a little bit
		const widthDiff = Math.abs(box[2] - box[0]);
		const heightDiff = Math.abs(box[3] - box[1]);
		const maxDiff = Math.max(widthDiff, heightDiff);

		if (maxDiff < 0.001) {
			increaseBoundSize(box, 0.001 - maxDiff);
		}

		map.camera.setView({
			destination: Cesium.Rectangle.fromDegrees(box[0], box[1], box[2], box[3])
		});
	}

	function increaseBoundSize(box: Array<number>, diff: number): void {
		box[0] = box[0] - diff;
		box[1] = box[1] - diff;
		box[2] = box[2] + diff;
		box[3] = box[3] + diff;
	}
</script>

<HeaderSearch
	bind:value={$value}
	bind:selectedResultIndex
	placeholder={txtPlaceholder}
	width={"600px"}
	{results}
	on:active={() => {
		events = [...events, { type: "active" }];
	}}
	on:inactive={() => {
		events = [...events, { type: "inactive" }];
	}}
	on:clear={() => {
		events = [...events, { type: "clear" }];
	}}
	on:select={(e) => {
		select(e.detail, geocoderName);
	}}
/>

<style>
	:global([role="search"]) {
		max-width: 100%;
		outline: 0px !important;
	}

	:global([slot="headerUtilities"]) {
		width: 100%;
	}
</style>
