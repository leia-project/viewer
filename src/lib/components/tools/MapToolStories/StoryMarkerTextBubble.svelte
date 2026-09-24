<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import * as Cesium from "cesium";
	import type { Map as CesiumMap } from "$lib/map-cesium/map";

	export let map: CesiumMap;
	export let marker: Cesium.Entity;
	export let text: string;

	let left = 0;
	let top = 0;
	let display = "none";
	const windowPosition = new Cesium.Cartesian2();

	onMount(() => {
		map.viewer.clock.onTick.addEventListener(updatePosition);
		updatePosition();
	});

	onDestroy(() => {
		map.viewer.clock.onTick.removeEventListener(updatePosition);
	});

	function updatePosition(): void {
		if (!marker.show) {
			display = "none";
			return;
		}

		const cartesianPosition = marker.position?.getValue(map.viewer.clock.currentTime, new Cesium.Cartesian3());
		if (!cartesianPosition) {
			display = "none";
			return;
		}

		const screenPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
			map.viewer.scene,
			cartesianPosition,
			windowPosition
		);
		if (!screenPosition) {
			display = "none";
			return;
		}

		left = screenPosition.x;
		top = screenPosition.y;
		display = "block";
	}
</script>

<div class="text-bubble" style="left:{left}px; top:{top}px; display:{display};">
	<div class="text-bubble-content">{text}</div>
	<div class="text-bubble-pointer"></div>
</div>

<style>
	.text-bubble {
		position: absolute;
		transform: translate(-50%, -100%);
		pointer-events: none;
		max-width: 220px;
	}

	.text-bubble-content {
		background-color: #ffffff;
		color: #161616;
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 0.8rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		text-align: center;
	}

	.text-bubble-pointer {
		width: 0;
		height: 0;
		margin: 0 auto;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 8px solid #ffffff;
	}
</style>
