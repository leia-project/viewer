<script lang="ts">
	import type { Readable } from "svelte/store";
	import { VehicleApi } from "carbon-icons-svelte";
	import type { Game } from "../../../module/game";
	import type { Evacuation } from "../../../module/game-elements/evacuation";
	import HexagonEvacuationEntries from "./HexagonEvacuationEntries.svelte";
	import HexagonLayerControl from "../../layer-manager/HexagonLayerControl.svelte";
	import GameButton from "../../general/GameButton.svelte";

	export let game: Game;

	const selectedHexagon = game.evacuationController.hexagonLayer.selectedHexagon;
	const selectedExtractionPoint = game.evacuationController.roadNetwork.selectedExtractionPoint;

	let evacuations: Readable<Array<Evacuation>>;

	const hexagonsLoaded = game.evacuationController.hexagonLayer.loaded;

	$: if ($hexagonsLoaded) {
		evacuations = game.evacuationController.evacuations;
	}

	$: canEvacuate = $selectedExtractionPoint !== undefined && $selectedHexagon !== undefined;

</script>


<HexagonLayerControl layer={game.evacuationController.hexagonLayer} />


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
			<GameButton
				icon={VehicleApi}
				borderHighlight={true}
				hasTooltip={false}
				buttonText="Evacueer"
				active={$selectedExtractionPoint !== undefined && $selectedHexagon !== undefined}
				on:click={() => game.evacuationController.evacuate()}
			/>
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
{#if $evacuations.length > 0}
	<ul>
		{#each $evacuations as evacuation}
			<HexagonEvacuationEntries {evacuation} />
		{/each}
	</ul>
{:else}
	<p>No evacuations in progress.</p>
{/if}


<style>

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

</style>