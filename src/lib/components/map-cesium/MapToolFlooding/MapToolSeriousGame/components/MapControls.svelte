<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import { Compass, Home, Save } from "carbon-icons-svelte";
	import GameButton from "./general/GameButton.svelte";
	import type { Game } from "../module/game";
	import MarvinInfoBoxAddOn from "./infobox/MarvinInfoBoxAddOn.svelte";

	export let game: Game;

	const marvinQuestionsPrepPhase: Array<string> = [
		"Where are high density areas (above average)?",
		"Where are vulnerable areas (above average)?",
		"Which areas rely primarily on residential or unclassified roads for evacuation?",
		"Which roads have longer expected evacuation time than 1 hr?",
		"Which 5 roads take the longest time to pass through under high traffic flow without safety guarantee?",
		"Which areas are located within 5000 meters of major roads (motorway, truck, primary)?",
		"Which buildings are used for education?",
	];

	const elapsedTime = game.elapsedTime;
	$: timestep = $elapsedTime * 6;
	$: marvinQuestionsDuringFlood = [
		`When do roads become impassable (flood depth > 0.5) in scenario ${game.scenarioName}?`,
		`Which roads will be flooded (flood depth > 0.5) in scenario ${game.scenarioName}?`,
		`When will vulnerable areas (higher than average) lose all accessible roads (flood_depth > 0.5m) in scenario ${game.scenarioName}?`,
		`When will high-density areas (above average) lose all passible roads (flood_depth > 0.5m) in scenario ${game.scenarioName}?`,
		`Current timestep is ${timestep}, which roads became newly flooded compared to previous timestep (interval=6) in scenario ${game.scenarioName}?`,
		`"Which vulnearble areas (above average) have flooeded roads (flood depth > 0.5) in scenario ${game.scenarioName} at timestep ${timestep}?`,
		`Which vulnerable areas (above average) cannot be reached by ambulance in scenario ${game.scenarioName} at timestep ${timestep}?`,

		// Firefighter
		`Which routes has passible flood depth for fire truck (flood depth < 0.4) in scenario ${game.scenarioName} at timestep ${timestep}?`,
		`Which areas with high population density (above average) lack impassible routes for fire truck (flood depth < 0.4) in scenario ${game.scenarioName} at timestep ${timestep}?`,

		// Healthcare
		`Which routes have passible flood depth for ambulance (flood depth < 0.4) in scenario ${game.scenarioName} at timestep ${timestep}?`,
		`Which medical services are no longer reachable by road within the distance of $radius meters in scenario ${game.scenarioName} at timestep ${timestep}?`
	];

	/* unused questions:
 		"Which areas have roads with capacity less than $volume or travel time larger than $hour hr nearby?",
		"Which roads require more than $minute minutes travel time even under high safety condition?",
		"Which roads have a traffic capacity greater than $volume vehicles per hour under any safety condition?",
		"Which roads passing top $rank high density areas need more hours to pass through?",
		"Where are the most $RANK populated areas?",

		// with specific timesteps
		"Which roads exceed flood depth of 0.5 in scenario $scenario at timestep $timestep?",
		"How many passible roads (flood depth < 0.5) for each area at timestep $timestep in scenario $scenario?",
		"Which areas have unflooded route (flood depth < 0.5) in scenario $scenario at timestep $timestep?",
		"Which areas are fully impassible in scenario $scenario at timestep $timestep?"
	*/

	const inPreparationPhase = game.inPreparationPhase;
	$: marvinQuestions = $inPreparationPhase ? marvinQuestionsPrepPhase : marvinQuestionsDuringFlood;

	let showSave = false;
	let saveTimeout: NodeJS.Timeout;
	function onSave() {
		clearTimeout(saveTimeout);
		showSave = true;
		saveTimeout = setTimeout(() => {
			showSave = false;
		}, 800);
	}
	onMount(() => game.on("game-saved", onSave));
	onDestroy(() => game.off("game-saved", onSave));

</script>


<div class="map-controls">
	{#if showSave}
	<div class="game-saved" transition:fade={{ duration: 300 }}>
		<Save size={16} />
		<span>Auto save</span>
	</div>
	{/if}
	<div class="marvin-container">
		{#key marvinQuestions}
		<MarvinInfoBoxAddOn
			{game}
			geoJSON={game.outlineGeoJSON}
			questions={marvinQuestions}
			right={"0"}
			bottom={"100%"}
			top={"auto"}
			left={"auto"}
		/>
		{/key}
	</div>
	<GameButton
		icon={Home}
		hasTooltip={true}
		size={20}
		on:click={() => game.flyHome()}
	>
		<svelte:fragment slot="popover">{$_("game.startPosition")}</svelte:fragment>
	</GameButton>
	<GameButton
		icon={Compass}
		hasTooltip={true}
		size={20}
		on:click={() => game.flyHome()}
	>
		<svelte:fragment slot="popover">{$_("game.north")}</svelte:fragment>
	</GameButton>
</div>


<style>
	
	.map-controls {
		display: flex;
		gap: 0.6rem;
		padding: 0.25rem;
	}


	.game-saved {
		display: flex;
		align-items: center;
		column-gap: 0.35rem;
		font-size: 0.8rem;
		color: #a8a8a8;
		margin-right: 2rem;
	}

	.marvin-container {
		display: flex;
		align-items: center;
	}

</style>