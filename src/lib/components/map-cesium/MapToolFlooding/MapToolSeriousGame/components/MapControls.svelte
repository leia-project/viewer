<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Compass, Home } from "carbon-icons-svelte";
	import type { Game } from "../module/game";

	export let game: Game;

</script>


<div class="map-controls">
	<Button
		icon={Home}
		iconDescription="Start Position"
		tooltipPosition="right"
		size="default"
		kind="secondary"
		on:click={() => game.flyHome()}
	/>
	<Button
		icon={Compass}
		iconDescription="Zoom to North"
		tooltipPosition="right"
		size="default"
		kind="secondary"
		on:click={() => game.flyHome()}
	/>
</div>


<style>
	
	.map-controls {
		display: flex;
		gap: 0.5rem;
		z-index: 1000;
	}

</style>