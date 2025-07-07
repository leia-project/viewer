<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { get, type Writable } from "svelte/store";
	import * as Cesium from "cesium";
	import type { RoadNetwork } from "../../module/game-elements/roads/road-network";
	import { RouteSegment } from "../../module/game-elements/roads/route-segments";
	import { Measure } from "../../module/game-elements/roads/measure";
	import RouteSegmentInfo from "./RouteSegmentInfo.svelte";

	export let node: RouteSegment | Measure;
	export let store: Writable<RouteSegment | Measure | undefined>;
	export let timeout: NodeJS.Timeout | undefined;
	export let roadNetwork: RoadNetwork;


	onMount(() => {
		roadNetwork.map.viewer.clock.onTick.addEventListener(updatePosition);
		//iconLayer.map.viewer.clock.onTick.addEventListener(updateSkewAngle);
	});
	onDestroy(() => {
		roadNetwork.map.viewer.clock.onTick.removeEventListener(updatePosition);
		if (switchUnsubscriber) switchUnsubscriber();
		//iconLayer.map.viewer.clock.onTick.removeEventListener(updateSkewAngle);
	});

	let opacity: number = 100;
	const switchUnsubscriber = store.subscribe((focused: RouteSegment | Measure | undefined) => {
		if (focused !== node) opacity = 0;
	});

	let left: number = 0;
	let top: number = 0;
	let bottom: number = 0;
	let display: string = "none";
	let windowPosition = new Cesium.Cartesian2();
	function updatePosition() {
		Cesium.SceneTransforms.worldToWindowCoordinates(roadNetwork.map.viewer.scene, node.position, windowPosition);
		if (windowPosition) {
			left = windowPosition.x;
			top = windowPosition.y;
			bottom = window.innerHeight - windowPosition.y - 6;
			if (display === 'none') display = 'block';
			
		} 
		else if (display === 'block') display = 'none';
	}


	function onMouseEnter(event: MouseEvent): void {
		if (get(roadNetwork.hoveredNode) !== node) roadNetwork.hoveredNode.set(node);
		clearTimeout(timeout);
		opacity = 100;
		event.stopPropagation();
	}


</script>



<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="infobox" style="left:{left}px; top:{top}px; display:{display}; opacity: {opacity}%; transition: opacity 0.5s;"
	on:mouseenter={(e) => onMouseEnter(e)}
	on:mouseleave={() => opacity = 0}
>
	<div class="infobox-content">
		{#if node instanceof RouteSegment}
			<RouteSegmentInfo segment={node} />
		{:else if node instanceof Measure}
			<div>Explanations on the measure</div>
		{/if}
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

</style>