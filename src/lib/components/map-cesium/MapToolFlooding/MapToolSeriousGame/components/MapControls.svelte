<script lang="ts">
	import { Compass, Home } from "carbon-icons-svelte";
	import GameButton from "./general/GameButton.svelte";
	import type { Game } from "../module/game";

	export let game: Game;

</script>


<div class="map-controls">
	<GameButton
		icon={Home}
		hasTooltip={true}
		size={20}
		on:click={() => game.flyHome()}
	>
		<svelte:fragment slot="popover">Start Position</svelte:fragment>
	</GameButton>
	<GameButton
		icon={Compass}
		hasTooltip={true}
		size={20}
		on:click={() => game.flyHome()}
	>
		<svelte:fragment slot="popover">Zoom to North</svelte:fragment>
	</GameButton>
	
</div>


<style>
	
	.map-controls {
		display: flex;
		gap: 0.6rem;
		padding: 0.25rem;
	}

</style>