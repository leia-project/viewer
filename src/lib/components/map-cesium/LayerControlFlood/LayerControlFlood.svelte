<script lang="ts">
	import { Button, Dropdown, Slider, TextInput } from "carbon-components-svelte";
	import * as Cesium from "cesium";

	import type { FloodLayer } from "../module/layers/flood-layer";
	import { _ } from "svelte-i18n";
	import { get, writable, type Writable } from "svelte/store";
	import { ArrowLeft, ArrowRight, Pause, Play } from "carbon-icons-svelte";

	export let layer: FloodLayer;

	let { timeSliderValue } = layer;
	let playing: boolean = false;
	let intervalId: NodeJS.Timeout


	function togglePlay() {
		playing = !playing;
		if (playing) {
			intervalId = setInterval(() => {
				layer.timeSliderValue.update((value) => {
				if (value >= layer.timeSliderMax) {
					playing = false;
					clearInterval(intervalId);
					return layer.timeSliderMin;
				}
				return value + layer.timeSliderStep;
				});
			}, 1000);
		} else {
			if (intervalId !== null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
  	}
</script>

<div class="control-section">
	<div class="control-header">Time slider</div>
	<div class="wrapper">
		<Slider 
			value={$timeSliderValue}
			labelText={$timeSliderValue} 
			fullWidth={true} 
			on:input={(e) => {
				layer.timeSliderValue.set(e.detail);
			}}
			hideTextInput={true} 
			min={layer.timeSliderMin} 
			max={layer.timeSliderMax} 
			step={layer.timeSliderStep} 
			minLabel={String(layer.timeSliderMin)} 
			maxLabel={String(layer.timeSliderMax)}
		/>
	</div>
	<div class="wrapper" style="display: flex; justify-content: center; gap: 4px;">
		<!-- Decrease time slider value by step -->
		<Button 
			kind="secondary" 
			size="small" 
			icon="{ArrowLeft}"
			on:click={() => {
				layer.timeSliderValue.update((value) => value - layer.timeSliderStep);
			}}
		/>
		{#if !playing}
			<Button 
				kind="secondary"
				size="small" 
				icon="{Play}"
				on:click={() => {
					togglePlay();
				}}
			/>
		{:else}
			<Button 
				kind="secondary"
				size="small" 
				icon="{Pause}"
				on:click={() => {
					togglePlay();
				}}
			/>	
		{/if}
		<!-- Increase time slider value by step -->
		<Button 
			kind="secondary"
			size="small" 
			icon="{ArrowRight}"
			on:click={() => {
				layer.timeSliderValue.update((value) => value + layer.timeSliderStep);
			}}
		/>
	</div>
</div>

<style>

	.control-header {
		margin-bottom: 8px;
	}
	.control-section {
		margin: 15px 0;
		position: relative;
	}

</style>