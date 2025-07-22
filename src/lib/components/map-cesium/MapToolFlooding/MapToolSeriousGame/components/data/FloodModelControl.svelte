<script lang="ts">
	import { Slider } from "carbon-components-svelte";
	import type { Game } from "../../module/game";

	// Make flood layer green if model is forwarded
	export let game: Game;
/* 
	const startTIme = game.startTime;
	const elapsed = game.elapsedTime;
	const forwarding = game.forwarding;
 */
	//const forwarded = setTime > currentTIme;


</script>


<div class="flood-model-control">
	<div class="data-menu-header">Flood Model Control</div>
	<div>Explanation on the model</div>
	<div>Data on expansion of the flood (area m2, number of hexagons, max flood depth, etc.)</div>
	<!-- Slider to fast forward model -->
	 <div class="slider-container">
		<div class="slider-label">Fast Forward Model</div>
		<Slider
			min={0}
			max={20}
			step={1}
		/>
	</div>
</div>


<style>

	.flood-model-control {
		background-color: rgb(var(--game-color-bg));
		color: var(--game-color-text);
		padding: 0.5rem;
	}

	.data-menu-header {
		font-weight: 700;
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
	}

	.slider-container {
		display: flex;
		margin-top: 1rem;
	}

	.slider-label {
		margin-right: 1rem;
		font-weight: 600;
	}

</style>