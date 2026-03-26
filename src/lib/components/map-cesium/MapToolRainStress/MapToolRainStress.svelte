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
    import { base } from "$app/paths";
    
    const { registerTool, selectedTool, map } = getContext<any>("mapTools");

    export let label: string | undefined;
  	export let scenario: string;
  	export let chosenRegion: string;
	export let noRegionSelected: string;
	export let otherBreaches: string;
	export let searchBreach: string;
	export let noResults: string;

	$: label = $_('tools.rainStress.label');
  	$: scenario = $_('tools.rainStress.scenario');
  	$: chosenRegion = $_('tools.rainStress.chosenRegion');
	$: scenario = $_('tools.flooding.scenario');
  	$: chosenRegion = $_('tools.rainStress.chosenRegion');
	$: noRegionSelected = $_('tools.rainStress.noRegionSelected');
	$: otherRegions = $_('tools.rainStress.otherRegions');
	$: searchRegion = $_('tools.rainStress.searchRegion');
	$: noResults = $_('tools.rainStress.noResults');
 
  
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
			const regionCollection = await fetch(`${base}/regions_wgs84.geojson`).then(res => res.json());
			console.log("Loaded region collection:", regionCollection);
			regions = regionCollection.features;
			console.log("Loaded regions:", regions);
			rainfallLayerController.addRegions(regions);
			setSearchResults();
		}
	});

	const searchString: Writable<string> = writable<string>("");
	let searchableList: Array<{ key: string; value: Region }> = new Array<{ key: string; value: Region }>();
	let searchResults: Array<Region> = new Array<Region>();

	function setSearchResults(): void {
		if (!regions) return;
		searchableList = regions.map((r) => ({ key: r.properties.naam.toLowerCase(), value: r }));
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
			<div class="bx--label">{chosenRegion}</div>
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
									items={$activeRegion.properties.scenario.map((sc) => ({ id: sc, text: "1:" + sc }))}
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
					{noRegionSelected}
				</div>
			{/if}
		</div>

		<div class="list-content">
			<div class="bx--label">{otherRegions}</div>
			<div class="search">
				<Search size="sm" light placeholder={searchRegion} bind:value={$searchString} />
			</div>
			<div class="search-results">
				{#if searchResults.length === 0}
					<div>{noResults}</div>
				{/if}
				{#each searchResults as region (region.properties.naam)}
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
