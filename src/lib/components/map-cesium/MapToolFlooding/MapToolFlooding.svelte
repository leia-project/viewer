<script lang="ts">
	import { getContext } from "svelte";
	import { writable, get, type Writable } from "svelte/store";
	import { WaveHeight } from "carbon-icons-svelte";
	import { Search, Dropdown } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { LayerConfig } from "$lib/components/map-core/layer-config";
	import type { IconLayer } from "../module/layers/icon-layer";
	import BreachEntry from "./BreachEntry.svelte";
	import type { CesiumIcon } from "../module/cesium-icon";
	import LayerControlFlood from "../LayerControlFlood/LayerControlFlood.svelte";
	import { FloodLayer } from "../module/layers/flood-layer";
	import * as Cesium from "cesium";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	const id: string = "flooding";
	const icon: any = WaveHeight;
	let label: string = $_("tools.flooding.label");
	let showOnBottom: boolean = false;

	let tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: settings = tool.settings;

	tool.settings.subscribe((settings) => {
        if (settings) {
			console.log(settings)
			iconLayer = addIconLayer();
        }
    });

	$: tool.label.set($_("tools.flooding.label"));

	let iconLayer: IconLayer;
	let floodLayer: FloodLayer | undefined;
	let layerControlRef;
	

	$: active = iconLayer.activeIcon;
	$: hovered = iconLayer.hoveredIcon;
	$: breaches = iconLayer.mapIcons;

	let searchString: Writable<string> = writable<string>("");
    let searchableList: Array<{ key: string; value: CesiumIcon }> = new Array<{ key: string; value: CesiumIcon }>();
    let searchResults: Array<CesiumIcon> = new Array<CesiumIcon>();

	let scenario: Writable<string> = writable()

	function searchBreach() {
		if (!breaches) return;
		searchableList = $breaches.map((b) => ({ key: b.properties.name.toLowerCase(), value: b }));
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
			if (iconLayer) iconLayer.hide();
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
                "url": get(tool.settings).breachUrl
            },
			isBackground: false,
			defaultOn: true,
			defaultAddToManager: false,
		});
		return map.addLayer(layerConfig);
	}

	$: iconLayer.activeIcon.subscribe((breach) => {
		if (!breach) {
			removeFloodLayer();
			return;
		}
		// set current scenario to first in list
		scenario.set(breach.properties.scenarios[0]);
		addFloodLayer();
	});

	$: scenario.subscribe((sc) => {
		if (!get(iconLayer.activeIcon)) {
			return;
		}
		addFloodLayer()
	});

	function addFloodLayer() {
		let breach = get(iconLayer.activeIcon);
		if (!breach) return;
		
		let layerId = `${breach.properties.dijkring}_${breach.properties.name}_${get(scenario)}`
		if (floodLayer?.config?.id !== layerId) {
			removeFloodLayer();
			try {
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
						url: `${$settings.scenariosBaseUrl}${layerId}/layer.json`,
						resolution: 50
					}
				}));
				// Fly to breach location
				map.viewer.flyTo(breach.billboard, {
					duration: 1,
					offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-60), 5000)
				});
			} catch (error) {
				console.error(error);
			}
		}
	}

	function removeFloodLayer() {
		if (floodLayer) {
			floodLayer.hide();
			floodLayer.removeFromMap();
			floodLayer = undefined;
			layerControlRef.$destroy();
		}
	}

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
								<Dropdown
									label={$_("tools.flooding.scenario")}
									items={$active.properties.scenarios.map((sc) => ({ id: sc, text: "1:" + sc }))}
									bind:selectedId={$scenario}
									titleText={$_("tools.flooding.scenario")}
								/>
								{#if floodLayer !== undefined}
									<LayerControlFlood
										bind:this={layerControlRef}
										layer={floodLayer}
										map={map}
										showGlobeOpacitySlider={true}
									/>
								{/if}
							</div>
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