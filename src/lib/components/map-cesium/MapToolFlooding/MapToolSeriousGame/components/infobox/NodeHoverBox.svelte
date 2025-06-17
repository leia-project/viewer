<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { get } from "svelte/store";
	import * as Cesium from "cesium";
	import type { RoadNetwork } from "../../module/game-elements/roads/road-network";
	import type { RouteSegment } from "../../module/game-elements/roads/route-segments";

	export let node: RouteSegment;
	export let roadNetwork: RoadNetwork;


	onMount(() => {
		roadNetwork.map.viewer.clock.onTick.addEventListener(updatePosition);
		//iconLayer.map.viewer.clock.onTick.addEventListener(updateSkewAngle);
	});
	onDestroy(() => {
		roadNetwork.map.viewer.clock.onTick.removeEventListener(updatePosition);
		if (hoveredSensorUnsubscriber) hoveredSensorUnsubscriber();
		//iconLayer.map.viewer.clock.onTick.removeEventListener(updateSkewAngle);
	});

	let opacity: number = 100;
	const hoveredSensorUnsubscriber = roadNetwork.hovered.subscribe((hoveredSensor: RouteSegment | undefined) => {
		if (hoveredSensor !== sensor) opacity = 0;
	});

	let left: number = 0;
	let top: number = 0;
	let bottom: number = 0;
	let display: string = "none";
	let windowPosition = new Cesium.Cartesian2();
	function updatePosition() {
		Cesium.SceneTransforms.worldToWindowCoordinates(handler.map.viewer.scene, sensor.cartesian3, windowPosition);
		if (windowPosition) {
			left = windowPosition.x;
			top = windowPosition.y;
			bottom = window.innerHeight - windowPosition.y - 6;
			if (display === 'none') display = 'block';
			
		} 
		else if (display === 'block') display = 'none';
	}


	function onMouseEnter(event: MouseEvent): void {
		if (get(handler.hoveredSensor) !== sensor) handler.hoveredSensor.set(sensor);
		clearTimeout(handler.sensorHoverBoxTimeOut);
		opacity = 100;
		event.stopPropagation();
	}

	const featureInfo = sensor.getFeatureInfo();

</script>



<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="infobox" style="left:{left}px; top:{top}px; display:{display}; opacity: {opacity}%; transition: opacity 0.5s;"
	on:mouseenter={(e) => onMouseEnter(e)}
	on:mouseleave={() => opacity = 0}
>
	<div class="infobox-content">
		<div class="icon">
			<svelte:component this={sensor.parentLayer.settings.svgIcon} />
		</div>
		<div class="text">
			<span class="title">{sensor.name}</span>
			{#each featureInfo as entry}
				<span>{@html entry.value}</span>
			{/each}
		</div>
	</div>
</div>


<style>

	.infobox {
		position: absolute;
		border-radius: 2px;
		padding: 5px 10px;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(10px);
		color: #fff;
		pointer-events: none;
	}

	.infobox-content {
		display: flex;
		align-items: center;
		border-radius: 30px 30px 30px 30px;
		background-color: rgb(var(--ark-rgb-bg-alt));
	}

	.icon {
		position: relative;
		width: 30px;
		padding: 5px 0 5px 10px;
		color: var(--ark-rgb-highlight);
	}

	.text {
		padding: 6px 15px 6px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		row-gap: 4px;
	}

	.title {
		font-size: 0.75rem;
	}


</style>