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

	let geocoderUrl = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
	let value = writable<string>();
	let selectedResultIndex = 0;
	let events: any[] = [];
	let results = new Array<any>();

	$: map = get(app.map);

	// Handle geocoder config
	app.map.subscribe((map) => {
		if (map) {
			map.configLoaded.subscribe((loaded: boolean) => {
				if (loaded) {
					if (map.toolSettings.geocoder) {
						if (map.toolSettings.geocoder.url) {
							geocoderUrl = map.toolSettings.geocoder.url;
						}
					}
				}
			});
		}
	});

	value.subscribe((v) => {
		if (v && v.length >= 1) {
			geosearch(v);
		} else {
			results = new Array<any>();
		}
	});

	function select(entity: any): void {
		const id = entity?.selectedResult?.locationId;

		if (id) {
			zoomTo(id);
		}
	}

	async function geosearch(query: string): Promise<void> {
		try {
			const result = await fetch(`${geocoderUrl}/suggest?wt=json&q=${query}`);
			const searchResults = await result.json();
			const entries = new Array<any>();

			for (let i = 0; i < searchResults.response.docs.length; i++) {
				const searchResult = searchResults.response.docs[i];
				entries.push({
					text: searchResult.weergavenaam,
					locationId: searchResult.id
				});
			}

			results = entries;
		} catch (e) {
			console.log("PDOK Geocoder", `Error getting suggest (${e})`);
		}
	}

	async function zoomTo(placeId: string): Promise<void> {
		try {
			const result = await fetch(`${geocoderUrl}/lookup?wt=json&id=${placeId}&fl=geometrie_ll`);
			const lookupResult = await result.json();

			if (lookupResult?.response?.docs?.length > 0) {
				const geomLL = lookupResult.response.docs[0].geometrie_ll;
				const box = wktToBox(geomLL);
				setCameraView(box);
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
		select(e.detail);
	}}
/>

<style>
	:global([role="search"]) {
		max-width: 100%;
	}

	:global([slot="headerUtilities"]) {
		width: 100%;
	}

	:global([role="search"]) {
		outline: 0px !important;
	}
</style>
