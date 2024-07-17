<script lang="ts">
	import { _ } from "svelte-i18n";
	import * as Cesium from 'cesium';
	import { Slider, NumberInput, Button } from "carbon-components-svelte";
	import Timer from "carbon-icons-svelte/lib/Timer.svelte";
	import CaretLeft from "carbon-icons-svelte/lib/CaretLeft.svelte";
	import PauseFilled from "carbon-icons-svelte/lib/PauseFilled.svelte";
	import PlayFilledAlt from "carbon-icons-svelte/lib/PlayFilledAlt.svelte";

	import type { Map } from "../module/map";
	import { onDestroy, onMount } from 'svelte';
	import { get, type Unsubscriber } from "svelte/store";
	import { ModelAnimation } from "../module/layers/model-animation";

	export let map: Map;

	let widgetOpen: boolean = true;

	map.viewer.clock.clockRange = Cesium.ClockRange.CLAMPED; //Limit time to interval between start and stop

	$: animating = map.options.animate;
	$: speed = map.viewer.clock.multiplier;
	$: forward = speed > 0;
	$: backward = speed < 0;

	const mapLayers = map.layers;
	let animatedLayers = $mapLayers.filter((layer) => layer.config.type === "modelanimation");

	let layersUnsuscriber: Unsubscriber;
	let animatedLayersUnsubscribers: Array<Unsubscriber> = [];

	onMount(() => {
		map.viewer.clock.onTick.addEventListener(getCurrentTimes);
		layersUnsuscriber = mapLayers.subscribe(() => {
			animatedLayers = $mapLayers.filter((layer) => layer.config.type === "modelanimation");
			animatedLayersUnsubscribers.forEach(unsub => unsub()); //remove all previous subscriptions
			animatedLayersUnsubscribers = [];
			animatedLayers?.forEach((layer) => {
				const unsubscriber = layer.visible.subscribe(setClockTimes);
				animatedLayersUnsubscribers.push(unsubscriber);
			});
		});
	});

	onDestroy(() => {
		map.viewer.clock.onTick.removeEventListener(getCurrentTimes);
		map.options.animate.set(false);
		layersUnsuscriber();
	});

	function setClockTimes(): void {
		const visibleAnimatedLayers = animatedLayers.filter((layer) => get(layer.visible) && layer instanceof ModelAnimation && layer.loaded);
		if (visibleAnimatedLayers.length === 0) return;
		map.viewer.clock.startTime = Cesium.JulianDate.fromDate(new Date());
		map.viewer.clock.stopTime = Cesium.JulianDate.fromDate(new Date(0));
		visibleAnimatedLayers.forEach((layer) => {
			if (!(layer instanceof ModelAnimation) || !get(layer.visible)) return;
			const start = Cesium.JulianDate.fromDate(layer.startTime);
			const end = Cesium.JulianDate.fromDate(layer.endTime);
			if (start && start < map.viewer.clock.startTime) map.viewer.clock.startTime = start;
			if (end && end > map.viewer.clock.stopTime) map.viewer.clock.stopTime = end;
		});
	}

	$: startTime = Cesium.JulianDate.toDate(map.viewer.clock.startTime);
	$: endTime = Cesium.JulianDate.toDate(map.viewer.clock.stopTime);
	$: sliderMin = startTime.getTime() ?? 0;
	$: sliderMax = endTime.getTime() ?? 10;


	let sliderValue: number;
	let timeString = "No time";
	function getCurrentTimes(): void {
		sliderValue = Cesium.JulianDate.toDate(map.viewer.clock.currentTime).getTime();
		timeString = Cesium.JulianDate.toDate(map.viewer.clock.currentTime).toLocaleString("nl-NL");
	}


</script>

{#if animatedLayers.length }
	<div class="animation-widget-container">
		<div class="hide-button">
			<Button
				iconDescription={widgetOpen ? $_('buttons.hide') : $_('animation.animationControls')}
				icon={widgetOpen ? CaretLeft : Timer}
				kind={widgetOpen ? "tertiary" : "primary"}
				size="small"
				tooltipPosition="right"
				on:click={() => widgetOpen = !widgetOpen}
			/>
		</div>
		{#if widgetOpen}
		<div class="animation-widget">
			<div class="current-time">
				<div>{$_('animation.currentTime')}</div>
				<div>{timeString}</div>
			</div>
			<div class="slider-container" class:forward={forward && $animating} class:backward={backward && $animating}>
				<Slider
					value={sliderValue}
					min={sliderMin}
					max={sliderMax}
					minLabel={startTime.toLocaleDateString("nl-NL")}
					maxLabel={endTime.toLocaleDateString("nl-NL")}
					step={1}
					hideTextInput={true}
					disabled={$animating}
					on:change={(e) => {
						if (!e.detail) return;
						const date = new Date(e.detail);
						map.viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
					}}
				/>
			</div>
			<!--<div class="startend"><div>{startTime.toLocaleDateString("nl-NL")}</div><div>{endTime.toLocaleDateString("nl-NL")}</div></div>-->
			<div class="animation-controls">
				<Button
					iconDescription={$animating ? $_('animation.pause') : $_('animation.play')}
					icon={$animating ? PauseFilled : PlayFilledAlt}
					kind={$animating ? "tertiary" : "primary"}
					size="small"
					tooltipPosition="right"
					on:click={() => {
						if ($animating) map.viewer.trackedEntity = undefined;
						map.options.animate.set(!$animating);
					}}
				/>
				<div class="speed-input-container">
					<div class="speed-input-label">{$_('animation.speed')}</div>
					<NumberInput
						size="sm"
						bind:value={speed}
						on:input={(e) => {
							if (e.detail === null) return;
							map.viewer.clock.multiplier = e.detail;
						}}
					/>
				</div>
			</div>
		</div>
		{/if}
	</div>
{/if}


<style>

	.animation-widget-container {
		font-size: var(--tosti-font-size-small);
		vertical-align: middle;
		text-align: center;
		color: var(--cds-ui-01);
		z-index: 10;
		text-align: left;
		min-width: 300px;
		position: relative;
	}
	.hide-button {
		position: absolute;
		left: 0;
		top: 0;
		width: 32px;
		height: 32px;
		transition: right 0.5s ease-in-out;
		z-index: 11;
	}
	.animation-widget {
		background-color: rgba(23, 23, 23, 0.6);
		backdrop-filter: blur(10px);
		padding: var(--cds-spacing-02);
		border-radius: 0 6px 6px 6px;
	}
	.current-time {
		text-align: center;
	}
	/*
	.startend {
		display: flex;
		justify-content: space-between;
		column-gap: 10px;
	}
	*/

	.slider-container :global(.bx--slider__thumb) {
		background: var(--cds-interactive-03);
		border-radius: 0;
		border-top: solid 0.44rem transparent; 
		border-bottom: solid 0.44rem transparent;
	}
	.slider-container.forward :global(.bx--slider__thumb) {
		background: transparent;
		border-left: solid 0.8rem var(--cds-interactive-03);
	}
	.slider-container.backward :global(.bx--slider__thumb) {
		background: transparent;
		border-right: solid 0.8rem var(--cds-interactive-03); 
	}
	.slider-container :global(.bx--slider__track) {
		background: var(--cds-interactive-03);
	}
	.slider-container :global(.bx--slider__filled-track) {
		background: var(--cds-interactive-03);
	}
	.slider-container :global(.bx--slider__range-label) {
		color: #fff;
		font-size: 0.7rem;
		margin-right: 0;
	}

	.animation-controls {
		display: grid;
		justify-content: center;
		align-items: flex-end;
		grid-template-columns: 32px 160px;
		column-gap: 10px;
	}
	.animation-controls :global(.bx--number--sm.bx--number input[type=number]) {
		padding-right: 4rem;
	}

</style>