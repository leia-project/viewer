<script lang="ts">
	// @ts-ignore
	import { Wkt } from "wicket";
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { getContext } from "svelte";
	import { get, writable } from "svelte/store";
	import { HeaderSearch } from "carbon-components-svelte";
	import { getFeatureBounds } from "$lib/components/map-cesium/module/utils/map-utils";

	export let txtPlaceholder = get(_)("tools.geocoder.search");

	const { app } = getContext<any>("page");

	let geocoderName: string;
	let geocoderUrl: string;
	let value = writable<string>();
	let selectedResultIndex = 0;
	let events: any[] = [];
	let results = new Array<any>();

	$: map = get(app.map);

	app.map.subscribe((map) => {
		if (map) {
			map.configLoaded.subscribe((loaded: boolean) => {
				if (loaded) {
					let geocoderConfig = map.config.tools.find((t: any) => t.id === "geocoder");

					if (geocoderConfig.enabled) {
						geocoderName = geocoderConfig.settings.name.toLowerCase();

						if (geocoderName === "nominatim") {
							geocoderUrl = "https://nominatim.openstreetmap.org";
						}
						else if (geocoderName === "locatieserver") {
							geocoderUrl = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
						};
						// TODO: Add option for custom geocoder
						if (geocoderConfig.settings.url) {
							geocoderUrl = geocoderConfig.settings.url;
						}
					}
				}
			});
		}
	});

	value.subscribe((v) => {
		if (v && v.length >= 1) {
			geosearch(v, geocoderName);
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
			}
			results = entries;
		} catch (e) {
			console.log(`${geocoder} geocoder`, `Error getting suggest (${e})`);
		}
	};

	async function zoomTo(locationId: string, geocoder: string): Promise<void> {
		try {
			if (geocoder === "nominatim") {
				const result = await fetch(`${geocoderUrl}/lookup?format=json&osm_ids=${locationId}`);
				const lookupResults = await result.json();
				const firstLookupResult = lookupResults[0];

				if (firstLookupResult) {
					const wktString = `POLYGON((${firstLookupResult.boundingbox[2]} ${firstLookupResult.boundingbox[0]}, ${firstLookupResult.boundingbox[2]} ${firstLookupResult.boundingbox[1]}, ${firstLookupResult.boundingbox[3]} ${firstLookupResult.boundingbox[1]}, ${firstLookupResult.boundingbox[3]} ${firstLookupResult.boundingbox[0]}, ${firstLookupResult.boundingbox[2]} ${firstLookupResult.boundingbox[0]}))`;
					const box = wktToBox(wktString);
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
		} catch (e) {
			console.log("PDOK Geocoder", `Error getting lookup (${e})`);
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
		if (box[0] === box[2] && box[1] === box[3]) {
			increaseBoundSize(box, 0.001);
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
