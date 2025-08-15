<script lang="ts" generics="T extends Hexagon | RouteSegment | Measure">
	import { onDestroy, onMount } from "svelte";
	import { get, type Writable } from "svelte/store";
	import * as Cesium from "cesium";
	import type { Map } from "$lib/components/map-cesium/module/map";
	import type { Hexagon } from "../../module/game-elements/hexagons/hexagon";
	import { RouteSegment } from "../../module/game-elements/roads/route-segments";
	import { Measure } from "../../module/game-elements/roads/measure";

	export let item: T;
	export let store: Writable<T | undefined>;
	export let timeout: NodeJS.Timeout | undefined;
	export let map: Map;
	export let type: "hover" | "selected";
	export let icon: any;
	export let selectStore: Writable<T | undefined> | undefined = undefined;


	onMount(() => {
		map.viewer.clock.onTick.addEventListener(updatePosition);
	});
	onDestroy(() => {
		map.viewer.clock.onTick.removeEventListener(updatePosition);
		if (switchUnsubscriber) switchUnsubscriber();
	});

	let opacity: number = 100;
	const switchUnsubscriber = store.subscribe((focused: T | undefined) => {
		if (focused !== item) opacity = 0;
	});

	let left: number = 0;
	let top: number = 0;
	let bottom: number = 0;
	let display: string = "none";
	let windowPosition = new Cesium.Cartesian2();
	function updatePosition() {
		Cesium.SceneTransforms.worldToWindowCoordinates(map.viewer.scene, item.centerCartesian3, windowPosition);
		if (windowPosition) {
			left = windowPosition.x;
			top = windowPosition.y;
			bottom = window.innerHeight - windowPosition.y - 6;
			if (display === 'none') display = 'block';
			
		} 
		else if (display === 'block') display = 'none';
	}

	function onMouseEnter(event: MouseEvent): void {
		if (get(store) !== item) store.set(item);
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
		pointer-events: {type === 'selected' ? 'auto' : 'none'}
	"
	on:mouseenter={(e) => { if (type === "hover") onMouseEnter(e) }}
	on:mouseleave={() => { if (type === "hover") opacity = 0; }}
	on:click={() => {
		if (selectStore && get(selectStore) !== item) selectStore.set(item);
	}}
>
	<div class="infobox-content">
		<div class="icon">
			<svelte:component this={icon} />
		</div>
		<div class="content">
			<slot />
		</div>
	</div>
</div>


<style>

	.infobox {
		/* Copy from GameContainer.svelte */
		--game-color-bg: 33, 33, 33;
		--game-color-contrast: #f0f0f0;
		--game-color-highlight: #9ccddc;
		--game-color-text: #ffffff;

		position: absolute;
		border-radius: 2px;
		color: #fff;
	}

	.infobox-content {
		display: flex;
		align-items: center;
		border-radius: 25px;
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

	.content {
		padding: 6px 15px 6px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		row-gap: 4px;
	}

</style>