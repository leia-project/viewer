<script lang="ts">
	import type { Game } from "../module/game";

	export let game: Game;

	const evacuations = game.evacuationController.evacuations;

</script>


<div class="evacuation-overview">
	<h3>Evacuations Overview</h3>
	{#if $evacuations.length > 0}
		<ul>
		{#each $evacuations as evacuation}
			<li>
			<span>{evacuation.hexagon.hex}</span>: {evacuation.extractionPoint.id} {evacuation.numberOfPersons} (evacuation.progress% complete)
			</li>
		{/each}
		</ul>
	{:else}
		<p>No evacuations in progress.</p>
	{/if}
</div>


<style>

	.evacuation-overview {
		background-color: #000;
	}

</style>