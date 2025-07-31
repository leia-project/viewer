<script lang="ts">
	import { FaceDizzyFilled, FaceWinkFilled } from "carbon-icons-svelte";
	import type { Game } from "../module/game";
	import Pill from "./general/Pill.svelte";

	export let game: Game;

	const loaded = game.loaded;
	const evacuatedCount = game.evacuationController.hexagonLayer.evacuatedCount;
	const victimCount = game.evacuationController.hexagonLayer.victimCount;

</script>


<div class="game-stats">
	{#key $loaded}
		<Pill
			icon={FaceDizzyFilled}
			label="Slachtoffers"
			value={$victimCount}
			color="#c21111"
			scale={1.2}
		/>
		<Pill
			icon={FaceWinkFilled}
			label="Geevacueerd"
			value={$evacuatedCount}
			color="green"
			scale={1.2}
		/>
	{/key}
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