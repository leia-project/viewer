<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import { app } from '$lib/app/app';
	import { notifications } from "$lib/components/map-core/notifications/notifications.js";
	import { Notification } from "$lib/components/map-core/notifications/notification.js";
	import { NotificationType } from "$lib/components/map-core/notifications/notification-type.js";
	import type { Map } from './map-cesium/module/map';
	import "@cesium/widgets/Source/widgets.css";

	import MapWidgetMouseCoordinates from "$lib/components/map-cesium/MapWidgetMouseCoordinates/MapWidgetMouseCoordinates.svelte";
	import MapWidgetLoading from "$lib/components/map-cesium/MapWidgetLoading/MapWidgetLoading.svelte";
	import MapWidgetCameraPosition from "$lib/components/map-cesium/MapWidgetCameraPosition/MapWidgetCameraPosition.svelte";
	import MapWidgetAnimation from "$lib/components/map-cesium/MapWidgetAnimation/MapWidgetAnimation.svelte";
	import MapWidgetProject from "$lib/components/map-cesium/MapToolProjects/MapWidgetProject.svelte";
	import { dragDropEvents } from "$lib/components/map-cesium/module/drag-n-drop";

	export let map: Map;

	let viewer: HTMLElement;
	let showMouseCoordinates = false;
	let showLoadingWidget = true;
	let showCameraPosition = false;
	let showAnimationWidget = false;
	let showProjectWidget = false;
	
	const unsubscribe = map.ready.subscribe((ready) => {
		const configSettings = get(app.configSettings)
		if (ready && configSettings && map.configured !== true) {
			if (configSettings.configUrl !== "") {
				map.setConfig(configSettings.configUrl);
			} else {
				const notification = new Notification(NotificationType.ERROR, "Error", $_("general.notifications.noConfigText"), 15000, true, true);
				notifications.send(notification);
			}
		}
	});

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

	onDestroy(() => unsubscribe())

</script>


<div bind:this={viewer} class="cesiumContainer" use:dragDropEvents={{map: map, enabled: map.options.enableDragDropFiles}} >
	<div class="map-widgets-top">
		{#if showProjectWidget}
			<MapWidgetProject {map} />
		{/if}
	</div>

	<div class="map-widgets-bottom">
		{#if showMouseCoordinates}
			<MapWidgetMouseCoordinates {map} />
		{/if}

		{#if showCameraPosition}
			<MapWidgetCameraPosition {map} />
		{/if}

		{#if showAnimationWidget}
			<MapWidgetAnimation {map} />
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

	.map-widgets-top {
		position: absolute;
		top: var(--cds-spacing-05);
		left: var(--cds-spacing-05);
		z-index: 10;
	}

	.map-widgets-bottom {
		position: absolute;
		bottom: var(--cds-spacing-05);
		left: var(--cds-spacing-05);
		z-index: 10;
	}

	:global(.cesium-widget-credits) {
		display: none !important;
	}
</style>
