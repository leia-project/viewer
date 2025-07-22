<script lang="ts">
	import * as Cesium from "cesium";
	import { Button, Slider } from "carbon-components-svelte";
	import type { Game } from "../../module/game";

	export let game: Game;

/* 	const startTime = game.startTime;
	const endTime = game.startTime + 12 * 60 * 60; // 12 hours in seconds */

	const simulationTime = game.elapsedTime;
	const selectedTime = game.elapsedTimeDynamic;

	$: timeDelta = $selectedTime - $simulationTime;
 
	const floodLayer = game.floodLayerController.floodLayer;

	$: floodLayer.source.color.set(
		timeDelta === 0 ? floodLayer.source.defaultColor 
		: timeDelta < 0 ? new Cesium.Cartesian3(0.5, 0, 0.5) // Past: purple
		: new Cesium.Cartesian3(1, 0, 0)) // Future: red
 

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
			max={12}
			step={0.1}
			bind:value={$selectedTime}
		/>
		<Button
			kind="secondary"
			size="small"
			on:click={() => selectedTime.set($simulationTime)}
			disabled={timeDelta === 0}
		>Reset</Button>
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