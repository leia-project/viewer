<script lang="ts">
	import { FaceDizzyFilled, FaceWinkFilled } from "carbon-icons-svelte";
	import type { Game } from "../module/game";
	import Pill from "./general/Pill.svelte";

	export let game: Game;

	const loaded = game.evacuationController.hexagonLayer.loaded;
	$: evacuatedCount = $loaded ? game.evacuationController.hexagonLayer.evacuatedCount : undefined
	$: victimCount = $loaded ? game.evacuationController.hexagonLayer.victimCount : undefined;

</script>


<div class="game-stats">
	{#if evacuatedCount !== undefined && victimCount !== undefined}
		<Pill
			icon={FaceDizzyFilled}
			label="Slachtoffers"
			value={$victimCount || 0}
			color="#c21111"
			scale={1.2}
		/>
		<Pill
			icon={FaceWinkFilled}
			label="Geevacueerd"
			value={$evacuatedCount || 0}
			color="green"
			scale={1.2}
		/>
	{/if}
</div>


<style>

	.game-stats {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		column-gap: 0.5rem;
		padding: 1rem;
	}
	
</style>