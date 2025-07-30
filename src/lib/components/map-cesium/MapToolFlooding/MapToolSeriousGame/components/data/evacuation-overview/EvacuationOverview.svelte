<script lang="ts">
	import type { Readable } from "svelte/store";
	import { VehicleApi } from "carbon-icons-svelte";
	import type { Game } from "../../../module/game";
	import type { Evacuation } from "../../../module/game-elements/evacuation";
	import HexagonEvacuationEntry from "./HexagonEvacuationEntry.svelte";
	import HexagonLayerControl from "../../layer-manager/HexagonLayerControl.svelte";
	import GameButton from "../../general/GameButton.svelte";

	export let game: Game;

	const selectedHexagon = game.evacuationController.hexagonLayer.selectedHexagon;
	const selectedExtractionPoint = game.evacuationController.roadNetwork.selectedExtractionPoint;

	const evacuatedFromHexagon = $selectedHexagon?.totalEvacuated;
	$: portionEvacuated = $selectedHexagon && $evacuatedFromHexagon ? $evacuatedFromHexagon / $selectedHexagon.population : 0;

	let evacuations: Readable<Array<Evacuation>>;

	const hexagonsLoaded = game.evacuationController.hexagonLayer.loaded;

	$: if ($hexagonsLoaded) {
		evacuations = game.evacuationController.evacuations;
	}

	$: canEvacuate = $selectedExtractionPoint !== undefined && $selectedHexagon !== undefined;

	const currentStep = game.currentStep;

</script>


<HexagonLayerControl layer={game.evacuationController.hexagonLayer} />

<div class="divider"></div>

<div class="evacuation-create">
	<span class="point point-a">
		<span class="point-label">From</span>
		<span>
			{#if $selectedHexagon}
				{$selectedHexagon.hex}
			{:else}
				No hexagon selected
			{/if}
		</span>
	</span>
	<div class="evacuate-button">
		{#if canEvacuate}
			{#if portionEvacuated >= 1}
				<div class="evacuate-notice">Already evacuated</div>
			{:else}
				<GameButton
					icon={VehicleApi}
					borderHighlight={true}
					hasTooltip={false}
					buttonText="Evacueer"
					active={$selectedExtractionPoint !== undefined && $selectedHexagon !== undefined}
					on:click={() => game.evacuationController.evacuate()}
				/>
			{/if}
		{/if}
	</div>
	<span class="point point-b">
		<span class="point-label">To</span>
		<span>
			{#if $selectedExtractionPoint}
				{$selectedExtractionPoint.id}
			{:else}
				No extraction point selected
			{/if}
		</span>
	</span>
</div>

<div class="divider"></div>

<div class="evacuation-list-header">
	<span>Evacuations</span>
	<span class="step-title">{$currentStep.title}</span>
</div>
{#if $evacuations.length > 0}
	<ul class="evacuation-list">
		{#each $evacuations as evacuation}
			<HexagonEvacuationEntry {evacuation} />
		{/each}
	</ul>
{:else}
	<p>No evacuations in progress.</p>
{/if}


<style>

	.divider {
		border-top: 1px solid var(--game-color-highlight);
		margin: 1rem 1rem;
	}

	.evacuation-create {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		column-gap: 2rem;
		margin-bottom: 1rem;
	}

	.point span {
		display: block;
	}

	.point-a {
		text-align: right;
	}

	.point-label {
		font-size: 0.8rem;
		color: var(--game-color-highlight);
	}

	.evacuate-notice {
		color: var(--game-color-highlight);
		font-weight: bold;
	}

	.evacuation-list-header {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--game-color-highlight);
		margin-bottom: 0.5rem;	
		display: flex;
		justify-content: space-between;
	}

	.step-title {
		font-size: 0.9rem;
		font-weight: 500;
		color: rgb(var(--game-color-bg));
		background-color: var(--game-color-highlight);
		padding: 0.2rem 0.5rem;
		border-radius: 5px;
	}

	.evacuation-list {
		max-height: 300px;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}

</style>