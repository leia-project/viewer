<script lang="ts">
	import { _ } from "svelte-i18n";
	import { FaceDizzyFilled, FaceWinkFilled } from "carbon-icons-svelte";
	import type { Game } from "../module/game";
	import Pill from "./general/Pill.svelte";
	import { slide } from "svelte/transition";

	export let game: Game;

	const loaded = game.evacuationController.hexagonLayer.loaded;
	$: evacuatedCount = $loaded ? game.evacuationController.hexagonLayer.evacuatedCount : undefined
	$: victimCount = $loaded ? game.evacuationController.hexagonLayer.victimCount : undefined;

</script>


<div class="game-stats" transition:slide={{ duration: 1000, axis: "y" }}>
	{#if evacuatedCount !== undefined && victimCount !== undefined}
		<Pill
			icon={FaceDizzyFilled}
			label={$_("game.victims")}
			value={$victimCount?.toLocaleString("nl-NL") || 0}
			color="#FF4500"
			scale={1}
		/>
		<Pill
			icon={FaceWinkFilled}
			label={$_("game.evacuated")}
			value={$evacuatedCount?.toLocaleString("nl-NL") || 0}
			color="#1a9850"
			scale={1}
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