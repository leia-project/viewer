<script lang="ts">
	import { onDestroy } from "svelte";
	import { writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { HeaderSearch } from "carbon-components-svelte";
	import { app } from "$lib/app/app";
	import { searchActive } from "../search-active";
	import {
		mergeSuggestions,
		resolveProviders,
		geocoderProviders,
		PER_PROVIDER_LIMIT,
		TOTAL_RESULT_LIMIT,
		type GeocoderProvider,
		type GeocoderSuggestion
	} from "./geocoder-providers";


	const map = app.map;
	const value = writable<string>();
	let providers = new Array<GeocoderProvider>();
	let providerUrls: Record<string, string> = {};
	let selectedResultIndex = 0;
	let events: any[] = [];
	let results = new Array<any>();
	let debounceTimer: ReturnType<typeof setTimeout>;
	let searchController: AbortController | undefined;
	let requestId = 0;


	onDestroy(() => {
		clearTimeout(debounceTimer);
		searchController?.abort();
	});


	map.subscribe((map) => {
		if (map) {
			map.configLoaded.subscribe((loaded: boolean) => {
				if (loaded) {
					const geocoderConfig = map.config.tools.find((t: any) => t.id === "geocoder");
					if (!geocoderConfig?.enabled) return;

					const settings = geocoderConfig.settings;
					providers = resolveProviders(settings?.name);
					providerUrls = {};

					for (const provider of providers) {
						providerUrls[provider.id] = provider.defaultUrl;
					}

					if (settings?.url) {
						if (providers.length === 1) {
							providerUrls[providers[0].id] = settings.url;
						} else {
							console.warn("A custom geocoder url is only supported when a single geocoder is configured");
						}
					}
				}
			});
		}
	});

	value.subscribe((v) => {
		if (v && v.length >= 1) {
			clearTimeout(debounceTimer);

			if (providers.some((p) => p.requiresDebounce)) {
				debounceTimer = setTimeout(() => geosearch(v), 1500);
			} else {
				geosearch(v);
			}
		} else {
			results = new Array<any>();
		}
	});

	function select(entity: any): void {
		const suggestion = entity?.selectedResult as GeocoderSuggestion | undefined;
		const provider = suggestion ? geocoderProviders[suggestion.providerId] : undefined;

		if (provider) {
			zoomTo(suggestion as GeocoderSuggestion, provider);
		}
	}

	async function geosearch(query: string): Promise<void> {
		searchController?.abort();
		const controller = new AbortController();
		searchController = controller;
		const currentRequest = ++requestId;

		const settled = await Promise.allSettled(
			providers.map((provider) =>
				provider.suggest(query, providerUrls[provider.id], PER_PROVIDER_LIMIT, controller.signal)
			)
		);

		// Discard responses that were superseded by a newer query.
		if (currentRequest !== requestId) return;

		const perProvider = settled.map((outcome, i) => {
			if (outcome.status === "fulfilled") return outcome.value;
			if (controller.signal.aborted) return [];

			console.log(`${providers[i].id} geocoder`, `Error getting suggest (${outcome.reason})`);
			return [];
		});

		results = mergeSuggestions(perProvider, TOTAL_RESULT_LIMIT).map((suggestion) => ({
			...suggestion,
			description: $_(geocoderProviders[suggestion.providerId].labelKey)
		}));
	}

	async function zoomTo(suggestion: GeocoderSuggestion, provider: GeocoderProvider): Promise<void> {
		try {
			const box = await provider.resolveBounds(suggestion.payload, providerUrls[provider.id]);
			if (box) setCameraView(box);
		} catch (e) {
			console.log(`${provider.id}: Error getting lookup (${e})`);
		}
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

		$map?.camera.setView({
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
	placeholder={$_("tools.geocoder.search")}
	width={"min(600px, 80vw)"}
	{results}
	on:active={() => {
		searchActive.set(true);
		events = [...events, { type: "active" }];
	}}
	on:inactive={() => {
		searchActive.set(false);
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
		outline: 0px !important;
	}

	:global([slot="headerUtilities"]) {
		width: 100%;
	}

	:global(.bx--header-search-menu-description) {
		text-transform: none !important;
	}
</style>
