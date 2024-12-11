<script lang="ts">
	import { getContext, onDestroy, onMount } from "svelte";
	import { writable, type Unsubscriber, type Writable, get } from "svelte/store";
	import { Close, WaveHeight } from "carbon-icons-svelte";
	import { Tabs, Tab, TabContent, Dropdown, Button, Slider, Search } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { LayerConfig } from "$lib/components/map-core/layer-config";
	import type { Map } from "$lib/components/map-cesium/module/map";
	import type { IconLayer } from "../module/layers/icon-layer";
	import BreachEntry from "./BreachEntry.svelte";
	import type { CesiumIcon } from "../module/cesium-icon";
	import LayerControlFlood from "../LayerControlFlood/LayerControlFlood.svelte";
	import { FloodLayer } from "../module/layers/flood-layer";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	const id: string = "flooding";
	const icon: any = WaveHeight;
	let label: string = $_("tools.flooding.label");
	let showOnBottom: boolean = false;
	let tool = new MapToolMenuOption(id, icon, label, showOnBottom);

	$: tool.label.set($_("tools.flooding.label"));

	let iconLayer: IconLayer;
	let floodLayer: FloodLayer;
	
	iconLayer = addIconLayer();

	$: active = iconLayer.activeIcon;
	$: hovered = iconLayer.hoveredIcon;
	$: breaches = iconLayer.mapIcons;
	$: mapLayers = map.layers;

	let searchString = writable<string>("");
    let searchableList: Array<{ key: string; value: CesiumIcon }> = new Array<{ key: string; value: CesiumIcon }>();
    let searchResults: Array<CesiumIcon> = new Array<CesiumIcon>();

	function searchBreach() {
		if (!breaches) return;
		searchableList = $breaches.map((b) => ({ key: b.properties.naam.toLowerCase(), value: b }));
		console.log(searchableList)
		searchResults = searchableList.filter((item) => item.key.toLowerCase().includes(get(searchString).toLowerCase()) || get(searchString) === "")
			.sort((a, b) => a.key.localeCompare(b.key))
			.map((item) => item.value);
	}

	$: searchString.subscribe(() => {
		searchBreach();
	});

	selectedTool.subscribe((selected: MapToolMenuOption) => {
		if (selected === tool) {
			iconLayer.show();
			zoomToLayer();
		} else {
			iconLayer.hide();
		}
	});

	$: iconLayer.loaded.subscribe((loaded) => {
		if (loaded) {
			zoomToLayer();
			searchBreach();
		}
	});


	function zoomToLayer() {
		const pos = iconLayer.getLayerPosition();
		if (pos) map.flyTo(pos);
	}

	function addIconLayer() {
		// add icon layer with breach locations
		const layerConfig = new LayerConfig({
			id: "fl_breachicons",
			title: "Breach Locations",
			type: "icon",
			settings: {
                "url": "https://virtueel.zeeland.nl/tiles_other/breslocaties.geojson"
            },
			isBackground: false,
			defaultOn: true,
			defaultAddToManager: false,
		});
		return map.addLayer(layerConfig);
	}

	$: iconLayer.activeIcon.subscribe((breach) => {
		if (!breach) {
			if (floodLayer) {
				floodLayer.hide();
				floodLayer.removeFromMap();
			}
			return;
		} else {
			let layerId = "fl_" + breach.properties.naam;
			if (floodLayer?.config?.id !== layerId) {
				console.log(`adding flood layer for breach ${breach.properties.naam}`);
				floodLayer = map.addLayer(new LayerConfig({
					id: layerId,
					type: "flood",
					title: "Flood layer",
					groupId: "",
					legendUrl: "",
					isBackground: false,
					defaultAddToManager: true,
					defaultOn: true,
					transparent: false,
					opacity: 0,
					settings: {
						url: "https://virtueel.zeeland.nl/tiles_other/flood_26_OS-dp15_300/layer.json",
						resolution: 50
					}
				}));
			}
		}
	});


	registerTool(tool);


</script>


{#if $selectedTool === tool}
	<div class="wrapper">
		<div class="selected-content">
			<div class="bx--label">Gekozen bres</div>
			{#if $active !== undefined}
				<BreachEntry
					bind:breach={$active}
					bind:active
					bind:hovered
				>
					<svelte:fragment slot="info"> 
						{#if $active }
							<div class="info-content">
								<LayerControlFlood
									layer={floodLayer}
									map={map}
								/>

							</div>
							<Button
								kind="ghost"
								iconDescription={undefined}
								icon={Close}
								size="small"
								on:click={() => active.set(undefined)}
							/>
						{/if}
					</svelte:fragment>
					
				</BreachEntry>
			{:else}
				<div>
					Geen bres geselecteerd
				</div>
			{/if}
		</div>

		<div class="list-content">
			<div class="bx--label">Overige bressen</div>
			<div class="search">
				<Search size="sm" light placeholder={"zoeken"} bind:value={$searchString} />
			</div>
			<div class="search-results">
				{#if searchResults.length === 0}
					<div>Geen resultaten</div>
				{/if}
				{#each searchResults as breach}
					{#if breach && (!$active || breach !== $active)}
						<BreachEntry
							bind:breach
							bind:active
							bind:hovered
						/>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

  
<style>

	.wrapper {
		width: 100%;
		padding: var(--cds-spacing-05);
	}

	.selected-content {
		margin-bottom: var(--cds-spacing-07);
	}

	.info-content {
		padding: 10px;
	}

	.search {
		margin-bottom: var(--cds-spacing-05);
	}

	.search-results {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

</style>