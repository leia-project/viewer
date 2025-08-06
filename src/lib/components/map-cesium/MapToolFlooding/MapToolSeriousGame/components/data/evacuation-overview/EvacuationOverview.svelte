<script lang="ts">
	import type { Readable } from "svelte/store";
	import { View } from "carbon-icons-svelte";
	import type { Game } from "../../../module/game";
	import type { Evacuation } from "../../../module/game-elements/evacuation";
	import HexagonEvacuationEntry from "./HexagonEvacuationEntry.svelte";
	import HexagonLayerControl from "../../layer-manager/HexagonLayerControl.svelte";
	import EvacuateAction from "./EvacuateAction.svelte";
	import GameButton from "../../general/GameButton.svelte";

	export let game: Game;

	const selectedHexagon = game.evacuationController.hexagonLayer.selectedHexagon;
	const selectedExtractionPoint = game.evacuationController.roadNetwork.selectedExtractionPoint;
	const hexagonsLoaded = game.evacuationController.hexagonLayer.loaded;

	let evacuations: Readable<Array<Evacuation>>;
	$: if ($hexagonsLoaded) {
		evacuations = game.evacuationController.evacuations;
	}

	const currentStep = game.currentStep;

	function showAllEvacuationsAggregated(): void {
		$evacuations.forEach((evacuation) => {
			evacuation.display($evacuations);
		});
	}

</script>


<HexagonLayerControl layer={game.evacuationController.hexagonLayer} />

<div class="divider"></div>

<div class="evacuation-create">
	<span class="point point-a">
		<span class="point-label">From</span>
		<span>
			{#if $selectedHexagon}
				<span>{$selectedHexagon.hex}</span>
			{:else}
				No hexagon selected
			{/if}
		</span>
	</span>
	<EvacuateAction
		hexagon={$selectedHexagon}
		evacuationController={game.evacuationController}
	/>
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
	<span>Evacuations ({$evacuations.length})</span>
	<div class="step-title">
		{#if $evacuations.length > 0}
			<GameButton
				icon={View}
				size={14}
				hasTooltip={false}
				borderHighlight={true}
				active={$evacuations.length > 0}
				buttonText={$currentStep.title}
				on:click={showAllEvacuationsAggregated}
			/>
		{:else}
			<span>{$currentStep.title}</span>
		{/if}
	</div>
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
		border-top: 1px solid lightslategray;
		margin: 1rem 1rem;
	}

	.evacuation-create {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		column-gap: 2rem;
		margin-bottom: 1rem;
	}

	.point-a {
		text-align: right;
	}

	.point-label {
		display: block;
		font-size: 0.8rem;
		color: var(--game-color-highlight);
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
	}

	.evacuation-list {
		max-height: 300px;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}

</style>