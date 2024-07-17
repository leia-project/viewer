<script lang="ts">
	import { onMount } from "svelte";
	import { Map } from "./module/map";
	import "@cesium/widgets/Source/widgets.css";

	import MapWidgetMouseCoordinates from "./MapWidgetMouseCoordinates/MapWidgetMouseCoordinates.svelte";
	import MapWidgetLoading from "./MapWidgetLoading/MapWidgetLoading.svelte";
	import MapWidgetCameraPosition from "./MapWidgetCameraPosition/MapWidgetCameraPosition.svelte";
	import MapWidgetAnimation from "./MapWidgetAnimation/MapWidgetAnimation.svelte";
	import MapWidgetProject from "./MapToolProjects/MapWidgetProject.svelte";
	import { dragDropEvents } from "./module/drag-n-drop";

	export let map: Map = new Map();

	let viewer: HTMLElement;
	let showMouseCoordinates = false;
	let showLoadingWidget = true;
	let showCameraPosition = false;
	let showAnimationWidget = false;
	let showProjectWidget = false;

	onMount(async () => {
		// @ts-ignore: now it exists
		window.CESIUM_BASE_URL = `${process.env.APP_URL}/Cesium`;
		map.initialize(viewer, false);

		map.configLoaded.subscribe((l) => {
			if (l) {
				map.options.showMouseCoordinates.subscribe((s) => {
					showMouseCoordinates = s;
				});

				map.options.showLoadingWidget.subscribe((s) => {
					showLoadingWidget = s;
				});

				map.options.showCameraPosition.subscribe((s) => {
					showCameraPosition = s;
				});

				map.options.showAnimationWidget.subscribe((s) => {
					showAnimationWidget = s;
				});

				map.options.selectedProject.subscribe((project) => {
					showProjectWidget = !!project;
				});
			}
		});
	});
</script>

<div bind:this={viewer} class="cesiumContainer" use:dragDropEvents={{map: map, enabled: map.options.enableDragDropFiles}} >
	<div class="map-widgets">
		{#if showMouseCoordinates}
			<MapWidgetMouseCoordinates {map} />
		{/if}

		{#if showCameraPosition}
			<MapWidgetCameraPosition {map} />
		{/if}

		{#if showAnimationWidget}
			<MapWidgetAnimation {map} />
		{/if}

		{#if showProjectWidget}
			<MapWidgetProject {map} />
		{/if}
	</div>

	{#if showLoadingWidget}
		<MapWidgetLoading {map} />
	{/if}
</div>

<style>
	.cesiumContainer {
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
		box-sizing: border-box;
	}

	.map-widgets {
		position: absolute;
		top: var(--cds-spacing-05);
		left: var(--cds-spacing-05);
		z-index: 10;
	}

	:global(.cesium-widget-credits) {
		display: none !important;
	}
</style>
