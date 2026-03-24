<script lang="ts">
    import { getContext } from "svelte";
    import { writable, get, type Writable } from "svelte/store";
    import { _ } from "svelte-i18n";
    import { Rain } from "carbon-icons-svelte";
    import { Search, Dropdown } from "carbon-components-svelte";
    import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import RegionEntry from "./RegionEntry.svelte";
    import LayerControlRainfall from "../LayerControlFlood/LayerControlRainfall.svelte";
	import { RainfallLayerController, type Region, type RainfallToolSettings } from "../MapToolRainStress/layer-controller";
    
    
    const { registerTool, selectedTool, map } = getContext<any>("mapTools");

    export let label: string | undefined;
  	export let scenario: string;
  	export let chosenBreach: string;
	export let noBreachSelected: string;
	export let otherBreaches: string;
	export let searchBreach: string;
	export let noResults: string;

   	$: scenario = $_('tools.flooding.scenario');
  	$: chosenBreach = $_('tools.flooding.chosenBreach');
	$: noBreachSelected = $_('tools.flooding.noBreachSelected');
	$: otherBreaches = $_('tools.flooding.otherBreaches');
	$: searchBreach = $_('tools.flooding.searchBreach');
	$: noResults = $_('tools.flooding.noResults');
  	$: label = label ?? $_('tools.rainStress.label');
  
	const id: string = "rainStress";
	const icon: any = Rain;
	const showOnBottom: boolean = false;
	
	const tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }
	registerTool(tool);
	
	const selectedScenario: Writable<string | undefined> = writable(undefined);

	let regions: Array<Region>;
	const activeRegion: Writable<Region | undefined> = writable(undefined);
	const hoveredRegion: Writable<Region | undefined> = writable(undefined);

	let rainfallLayerController: RainfallLayerController | undefined;
	
	tool.settings.subscribe(async(settings?: RainfallToolSettings) => {
		if (settings) {
			rainfallLayerController = new RainfallLayerController(map, settings, activeRegion, selectedScenario);
			const regionCollection = await fetch('/regions.geojson').then(res => res.json());
			regions = regionCollection.features;
			rainfallLayerController.addRegions(regions);
			setSearchResults();
		}
	});

	const searchString: Writable<string> = writable<string>("");
	let searchableList: Array<{ key: string; value: Region }> = new Array<{ key: string; value: Region }>();
	let searchResults: Array<Region> = new Array<Region>();

	function setSearchResults(): void {
		if (!regions) return;
		searchableList = regions.map((r) => ({ key: r.properties.name.toLowerCase(), value: r }));
		searchResults = searchableList.filter((item) => item.key.toLowerCase().includes(get(searchString).toLowerCase()) || get(searchString) === "")
			.sort((a, b) => a.key.localeCompare(b.key))
			.map((item) => item.value);
	}

	searchString.subscribe(() => {
		setSearchResults();
	});

	selectedTool.subscribe((selected: MapToolMenuOption) => {
		if (selected === tool) {
			rainfallLayerController?.showAll();
		}
	});

	activeRegion.subscribe((region) => {
		if (region && !$selectedTool) {
			$selectedTool = tool
		}
	});

</script>

{#if $selectedTool === tool && rainfallLayerController}
	<div class="wrapper">
		<div class="selected-content">
			<div class="bx--label">{chosenBreach}</div>
			{#if $activeRegion}
				{#key $activeRegion}
					<RegionEntry
						region={$activeRegion}
						active={activeRegion}
						hovered={hoveredRegion}
					>
						<svelte:fragment slot="info"> 
							<div class="info-content">
								<Dropdown
									label={scenario}
									items={$activeRegion.properties.scenarios.map((sc) => ({ id: sc, text: "1:" + sc }))}
									bind:selectedId={$selectedScenario}
									titleText={scenario}
								/>
								{#if $selectedScenario}
									<LayerControlRainfall
										{rainfallLayerController}
										map={map}
										showGlobeOpacitySlider={true}
									/>
								{/if}
							</div>
						</svelte:fragment>
					</RegionEntry>
				{/key}
			{:else}
				<div>
					{noBreachSelected}
				</div>
			{/if}
		</div>

		<div class="list-content">
			<div class="bx--label">{otherBreaches}</div>
			<div class="search">
				<Search size="sm" light placeholder={searchBreach} bind:value={$searchString} />
			</div>
			<div class="search-results">
				{#if searchResults.length === 0}
					<div>{noResults}</div>
				{/if}
				{#each searchResults as region (region.properties.name)}
					{#if region && (!$activeRegion || region !== $activeRegion)}
						<RegionEntry
							bind:region
							active={activeRegion}
							hovered={hoveredRegion}
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
