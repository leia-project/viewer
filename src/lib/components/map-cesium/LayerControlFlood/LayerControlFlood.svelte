<script lang="ts">
	import { onDestroy } from "svelte";
	import { _ } from "svelte-i18n";
	import { Button, Loading, Slider, Toggle } from "carbon-components-svelte";
	import { ArrowLeft, ArrowRight, Pause, Play } from "carbon-icons-svelte";

	import type { Map } from "../module/map";
	import ErrorMessage from "$lib/components/ui/components/ErrorMessage/ErrorMessage.svelte";
	import { FloodLayerController } from "../MapToolFlooding/layer-controller";
	import { DepthGauge } from "./depth-gauge";

	
	export let floodLayerController: FloodLayerController;
	export let map: Map;
	export let showGlobeOpacitySlider: boolean = true;
	
	const globeOpacity = map.options.globeOpacity;
	const { time, minTime, maxTime, stepInterval } = floodLayerController;
	const error = floodLayerController.floodLayer.error;
	const floodLayerLoaded = floodLayerController.floodLayer.loaded;
	const floodOpacity = floodLayerController.floodLayer.opacity;

	let playing: boolean = false;
	let intervalId: NodeJS.Timeout | null;
	function togglePlay(): void {
		playing = !playing;
		if (playing) {
			intervalId = setInterval(() => {
				time.update((value) => {
					if (value >= $maxTime) {
						stopPlaying();
						return value;
					}
					return value + $stepInterval;
				});
			}, 1000 * $stepInterval);
		} else {
			stopPlaying();
		}
  	}

	function stopPlaying(): void {
		playing = false;
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	const depthGauge = new DepthGauge(map);
	let depthGaugeEnabled = false;

	$: depthGaugeEnabled ? depthGauge.activate() : depthGauge.deactivate();
	
	onDestroy(() => {
		stopPlaying();
		depthGauge.deactivate();
	});

</script>


{#if !$floodLayerLoaded}
	<div class="loading-wrapper">
		<Loading withOverlay={false} small />
	</div>
{:else if $error}
	<div class="loading-wrapper">
		<ErrorMessage message={$_("tools.flooding.errorCouldNotLoad")} />
	</div>
{:else}
	<div class="control-section">
		<div class="wrapper">
			{#if showGlobeOpacitySlider}
				<Slider
					bind:value={$globeOpacity}
					hideTextInput
					labelText={$_("tools.backgroundControls.opacity") + " " + $globeOpacity + "%"}
					min={0}
					max={100}
					step={1}
				/>
			{/if}
		</div>
		<div class="wrapper">
			<Slider 
				bind:value={$floodOpacity}
				labelText={$_('tools.flooding.waterTransparency') + ' ' + $floodOpacity + '%'} 
				fullWidth={true} 
				hideTextInput={true} 
				min={0} 
				max={100} 
				step={1} 
				minLabel={"0"} 
				maxLabel={"100"}
			/>
		</div>
		<div class="label-01">Time slider</div>
		<div class="wrapper">
			<Slider 
				bind:value={$time}
				labelText={`${Math.round($time)}` + ' ' + $_('tools.flooding.hourSinceBreach')}
				fullWidth={true}
				hideTextInput={true}
				min={$minTime}
				max={$maxTime}
				step={$stepInterval}
				minLabel={$minTime.toString()}
				maxLabel={$maxTime.toString()}
				on:input={stopPlaying}
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
					time.update((value) => Math.max(0, Math.round(value - 1)));
					stopPlaying();
				}}
			/>
			<Button 
				kind="secondary"
				size="small" 
				icon={playing ? Pause : Play}
				iconDescription={playing ? $_('tools.animation.pause') : $_('tools.animation.play')}
				on:click={() => {
					togglePlay();
				}}
			/>
			<Button 
				kind="secondary"
				size="small" 
				icon="{ArrowRight}"
				iconDescription={$_('tools.animation.next')}
				on:click={() => {
					// After switching scenario or breach, the Slider no longer listens to layer.timeSliderValue, so #timeSliderValue must be updated manually
					time.update((value) => Math.min($maxTime, Math.round(value +1)));
					stopPlaying();
				}}
			/>
		</div>
	</div>
	<div class="measure">
		<div class="measure-checkbox">
			<span class="label-02">{$_("tools.flooding.measureDepth")}</span>
			<Toggle
				bind:toggled={depthGaugeEnabled}
				hideLabel={true}
				labelA={$_("general.off")}
				labelB={$_("general.on")}
			/>
		</div>
	</div>
{/if}


<style>

	.loading-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		margin: var(--cds-spacing-05) 0;
	}
	.wrapper {
		margin-bottom: 8px;
	}
	.control-section {
		margin: 15px 0;
		position: relative;
	}

	.measure {
		margin: 10px 0 15px;
		background-color: var(--cds-ui-01);
		border-radius: 5px;
		border: 1px solid var(--cds-ui-03);
	}
	.measure-checkbox {
		display: flex;
		align-items: center;
		column-gap: 20px;
		padding-left: 10px;
	}
	.label-02 {
		padding: 15px 0;
	}

</style>