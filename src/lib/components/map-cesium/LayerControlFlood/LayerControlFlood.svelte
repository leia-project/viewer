<script lang="ts">
	import { Button, Dropdown, Slider, TextInput } from "carbon-components-svelte";
	import * as Cesium from "cesium";

	import type { FloodLayer } from "../module/layers/flood-layer";
	import { _ } from "svelte-i18n";
	import { get, writable, type Writable } from "svelte/store";
	import { ArrowLeft, ArrowRight, Pause, Play } from "carbon-icons-svelte";

	export let layer: FloodLayer;

	let { timeSliderValue, timeSliderMin, timeSliderMax, timeSliderStep } = layer;
	let playing: boolean = false;
	let intervalId: NodeJS.Timeout


	function togglePlay() {
		playing = !playing;
		if (playing) {
			intervalId = setInterval(() => {
				layer.timeSliderValue.update((value) => {
				if (value >= $timeSliderMax) {
					playing = false;
					clearInterval(intervalId);
					return $timeSliderMin;
				}
				return value + $timeSliderStep;
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
			labelText={String($timeSliderValue)} 
			fullWidth={true} 
			on:input={(e) => {
				layer.timeSliderValue.set(e.detail);
			}}
			hideTextInput={true} 
			min={$timeSliderMin} 
			max={$timeSliderMax} 
			step={$timeSliderStep} 
			minLabel={String($timeSliderMin)} 
			maxLabel={String($timeSliderMax)}
		/>
	</div>
	<div class="wrapper" style="display: flex; justify-content: center; gap: 4px;">
		<!-- Decrease time slider value by step -->
		<Button 
			kind="secondary" 
			size="small" 
			icon="{ArrowLeft}"
			iconDescription={$_('tools.animation.previous')}
			on:click={() => {
				layer.timeSliderValue.update((value) => value - $timeSliderStep);
			}}
		/>
		{#if !playing}
			<Button 
				kind="secondary"
				size="small" 
				icon="{Play}"
				iconDescription={$_('tools.animation.play')}
				on:click={() => {
					togglePlay();
				}}
			/>
		{:else}
			<Button 
				kind="secondary"
				size="small" 
				icon="{Pause}"
				iconDescription={$_('tools.animation.pause')}
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
			iconDescription={$_('tools.animation.next')}
			on:click={() => {
				layer.timeSliderValue.update((value) => value + $timeSliderStep);
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