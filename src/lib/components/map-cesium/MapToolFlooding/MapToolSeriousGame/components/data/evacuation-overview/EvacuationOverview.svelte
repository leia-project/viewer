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


<div>
	Selected hexagon -----[BUTTON]-----------> Selected Extraction Point
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

</style>