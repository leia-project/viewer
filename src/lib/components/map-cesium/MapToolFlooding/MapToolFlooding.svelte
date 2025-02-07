<script lang="ts">
	import { getContext } from "svelte";
	import { writable, get, type Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { WaveHeight } from "carbon-icons-svelte";
	import { Search, Dropdown } from "carbon-components-svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import BreachEntry from "./BreachEntry.svelte";
	import LayerControlFlood from "../LayerControlFlood/LayerControlFlood.svelte";
	import { FloodLayerController, type Breach, type FloodToolSettings } from "./layer-controller";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	const id: string = "flooding";
	const icon: any = WaveHeight;
	const label: string = $_("tools.flooding.label");
	const showOnBottom: boolean = false;

	const tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	registerTool(tool);


	const selectedScenario: Writable<string | undefined> = writable(undefined);

	let breaches: Array<Breach>;
	const activeBreach: Writable<Breach | undefined> = writable(undefined);
	const hoveredBreach: Writable<Breach | undefined> = writable(undefined);

	let floodLayerController: FloodLayerController | undefined;
	
	tool.settings.subscribe(async(settings?: FloodToolSettings) => {
		if (settings) {
			floodLayerController = new FloodLayerController(map, settings, activeBreach, selectedScenario);
			const breachCollection = await fetch(settings.breachUrl).then((res) => res.json());
			breaches = breachCollection.features;
			floodLayerController.addBreaches(breaches);
			setSearchResults();
		}
	});

	const searchString: Writable<string> = writable<string>("");
	let searchableList: Array<{ key: string; value: Breach }> = new Array<{ key: string; value: Breach }>();
	let searchResults: Array<Breach> = new Array<Breach>();

	function setSearchResults(): void {
		if (!breaches) return;
		searchableList = breaches.map((b) => ({ key: b.properties.name.toLowerCase(), value: b }));
		searchResults = searchableList.filter((item) => item.key.toLowerCase().includes(get(searchString).toLowerCase()) || get(searchString) === "")
			.sort((a, b) => a.key.localeCompare(b.key))
			.map((item) => item.value);
	}

	searchString.subscribe(() => {
		setSearchResults();
	});

	selectedTool.subscribe((selected: MapToolMenuOption) => {
		if (selected === tool) {
			floodLayerController?.showAll();
		}
	});

	activeBreach.subscribe((breach) => {
		if (breach && !$selectedTool) {
			$selectedTool = tool
		}
	});
	

</script>


{#if $selectedTool === tool && floodLayerController}
	<div class="wrapper">
		<div class="selected-content">
			<div class="bx--label">Gekozen bres</div>
			{#if $activeBreach}
				{#key $activeBreach}
					<BreachEntry
						breach={$activeBreach}
						active={activeBreach}
						hovered={hoveredBreach}
					>
						<svelte:fragment slot="info"> 
							<div class="info-content">
								<Dropdown
									label={$_("tools.flooding.scenario")}
									items={$activeBreach.properties.scenarios.map((sc) => ({ id: sc, text: "1:" + sc }))}
									bind:selectedId={$selectedScenario}
									titleText={$_("tools.flooding.scenario")}
								/>
								{#if $selectedScenario}
									<LayerControlFlood
										{floodLayerController}
										map={map}
										showGlobeOpacitySlider={true}
									/>
								{/if}
							</div>
						</svelte:fragment>
					</BreachEntry>
				{/key}
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
				{#each searchResults as breach (breach.properties.name)}
					{#if breach && (!$activeBreach || breach !== $activeBreach)}
						<BreachEntry
							bind:breach
							active={activeBreach}
							hovered={hoveredBreach}
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