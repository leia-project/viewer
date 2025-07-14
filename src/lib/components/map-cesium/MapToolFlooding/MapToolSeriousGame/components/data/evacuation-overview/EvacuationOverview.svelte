<script lang="ts">
	import type { Readable } from "svelte/store";
	import type { Game } from "../../../module/game";
	import type { Evacuation } from "../../../module/game-elements/evacuation";
	import HexagonEvacuationEntries from "./HexagonEvacuationEntries.svelte";

	export let game: Game;

	let evacuations: Readable<Array<Evacuation>>;

	const hexagonsLoaded = game.evacuationController.hexagonLayer.loaded;

	$: if ($hexagonsLoaded) {
		evacuations = game.evacuationController.evacuations;
	}

</script>


<div class="evacuation-overview">
	<div>Evacuaties</div>
	{#if $evacuations.length > 0}
		<ul>
			{#each $evacuations as evacuation}
				<HexagonEvacuationEntries {evacuation} />
			{/each}
		</ul>
	{:else}
		<p>No evacuations in progress.</p>
	{/if}
</div>


<style>

	.evacuation-overview {
		background-color: rgb(var(--game-color-bg));
		color: var(--game-color-text);
		padding: 0.5rem;
		text-align: start;
	}

</style>