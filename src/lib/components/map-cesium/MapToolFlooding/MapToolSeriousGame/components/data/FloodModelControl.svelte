<script lang="ts">
	import { onDestroy } from "svelte";
	import * as Cesium from "cesium";
	import { Button, Slider } from "carbon-components-svelte";
	import { Reset } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";

	export let game: Game;

	const simulationTime = game.elapsedTime;
	const selectedTime = game.elapsedTimeDynamic;

	$: timeDelta = $selectedTime - $simulationTime;
 
	const floodLayer = game.floodLayerController.floodLayer;

	$: floodLayer.source.color.set(
		timeDelta === 0 ? floodLayer.source.defaultColor 
		: timeDelta < 0 ? new Cesium.Cartesian3(0.5, 0, 0.5) // Past: purple
		: new Cesium.Cartesian3(1, 0, 0)) // Future: red
	
	onDestroy(() => {
		selectedTime.set($simulationTime);
		floodLayer.source.color.set(floodLayer.source.defaultColor);
	});

</script>


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
		hideLabel={true}
		hideTextInput={true}
	/>
	<Button
		kind="primary"
		size="small"
		disabled={timeDelta === 0}
		icon={Reset}
		iconDescription="Reset Time"
		on:click={() => selectedTime.set($simulationTime)}
	/>
</div>


<style>

	.slider-container :global(.bx--slider__thumb) {
		background: var(--game-color-highlight);
		border-radius: 50%;
		border-top: solid 0.44rem transparent; 
		border-bottom: solid 0.44rem transparent;
	}
	.slider-container :global(.bx--slider__track) {
		background: var(--game-color-highlight);
	}
	.slider-container :global(.bx--slider__filled-track) {
		background: var(--game-color-highlight);
	}
	.slider-container :global(.bx--slider__range-label) {
		color: #fff;
		font-size: 0.7rem;
		margin-right: 0;
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