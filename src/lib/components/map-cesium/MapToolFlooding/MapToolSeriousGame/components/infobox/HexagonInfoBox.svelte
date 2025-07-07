<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import * as Cesium from "cesium";
	import { HexagonVerticalOutline } from "carbon-icons-svelte";
	import type { Map } from "$lib/components/map-cesium/module/map";
	import type { Hexagon } from "../../module/game-elements/hexagons/hexagon";
	import { get, type Writable } from "svelte/store";
	import { Button } from "carbon-components-svelte";
	import type { EvacuationController } from "../../module/game-elements/evacuation-controller";

	export let hexagon: Hexagon;
	export let store: Writable<Hexagon | undefined>;
	export let timeout: NodeJS.Timeout | undefined;
	export let map: Map;
	export let type: "hover" | "selected";
	export let evacuationController: EvacuationController;

	const evacuations = hexagon.evacuations;
	const evacuated = hexagon.totalEvacuated;

	const selectedExtractionPoint = evacuationController.roadNetwork.selectedExtractionPoint;

	onMount(() => {
		map.viewer.clock.onTick.addEventListener(updatePosition);
	});
	onDestroy(() => {
		map.viewer.clock.onTick.removeEventListener(updatePosition);
		if (switchUnsubscriber) switchUnsubscriber();
	});

	let opacity: number = 100;
	const switchUnsubscriber = store.subscribe((focused: Hexagon | undefined) => {
		if (focused !== hexagon) opacity = 0;
	});

	let left: number = 0;
	let top: number = 0;
	let bottom: number = 0;
	let display: string = "none";
	let windowPosition = new Cesium.Cartesian2();
	function updatePosition() {
		Cesium.SceneTransforms.worldToWindowCoordinates(map.viewer.scene, hexagon.centerCartesian3, windowPosition);
		if (windowPosition) {
			left = windowPosition.x;
			top = windowPosition.y;
			bottom = window.innerHeight - windowPosition.y - 6;
			if (display === 'none') display = 'block';
			
		} 
		else if (display === 'block') display = 'none';
	}

	function onMouseEnter(event: MouseEvent): void {
		if (get(store) !== hexagon) store.set(hexagon);
		clearTimeout(timeout);
		opacity = 100;
		event.stopPropagation();
	}

</script>


<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="infobox" style="
		left:{left}px; 
		bottom:{bottom}px; 
		display:{display}; 
		opacity: {opacity}%; transition: opacity 0.5s; 
		z-index: {type === 'selected' ? 2 : 1}; 
		pointer-events: ${type === 'selected' ? 'auto' : 'none'}
	"
	on:mouseenter={(e) => { if (type === "hover") onMouseEnter(e) }}
	on:mouseleave={() => { if (type === "hover") opacity = 0; }}
	on:click={() => {
		const selected = evacuationController.hexagonLayer.selectedHexagon;
		if (get(selected) !== hexagon) selected.set(hexagon);
	}}
>
	<div class="infobox-content">
		<div class="icon">
			<!-- <svelte:component this={sensor.parentLayer.settings.svgIcon} /> -->
			 <HexagonVerticalOutline />
		</div>
		<div class="text">
			<div>Population: {hexagon.population}</div>
			<div>Evacuated: {$evacuated}</div>
			{#if type === "selected"}
				{#if $selectedExtractionPoint}
					<Button
						kind="primary"
						size="small"
						icon={HexagonVerticalOutline}
						on:click={() => evacuationController.evacuate(hexagon)}
					>Evacuate</Button>
				{:else}
					Select an extraction point to evacuate
				{/if}
			{/if}
		</div>
	</div>
</div>


<style>

	.infobox {
		position: absolute;
		border-radius: 2px;
		color: #fff;
	}

	.infobox-content {
		display: flex;
		align-items: center;
		border-radius: 30px 30px 30px 30px;
		background-color: rgb(60, 60, 60, 0.75);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.icon {
		position: relative;
		width: 30px;
		padding: 5px 0 5px 10px;
		color: #b6e5ed;
	}

	.text {
		padding: 6px 15px 6px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		row-gap: 4px;
	}

</style>