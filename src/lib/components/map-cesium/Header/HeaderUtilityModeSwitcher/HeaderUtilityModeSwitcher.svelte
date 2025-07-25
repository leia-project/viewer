<script lang="ts">
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { getContext, onMount } from "svelte";
	import { get, writable, type Writable } from "svelte/store";
	import { Toggle } from "carbon-components-svelte";
	import type { Map } from "../../module/map";


	const { app } = getContext<any>("page");

	$: map = get(app.map) as Map;
	$: use3Dmode = map.options.use3DMode;
	$: disableModeSwitcher = map.options.disableModeSwitcher;
	let ready = false;

	onMount(() => {
		const unsubscribe = use3Dmode.subscribe((b) => {
			// Ignore first call because it is called when the map is initialized
			if (ready) {
				b ? to3D() : to2D();
			} else {
				if (!b) initializeIn2D();
				ready = true;
			}
		});

		return () => {
			unsubscribe();
		};
	});
	
	function initializeIn2D() {
		if (map) {
			// Disable tilt controls
			map.viewer.scene.screenSpaceCameraController.enableTilt = false;

			// Disable terrain
			const terrainProviderOff = get(map.options.terrainProviders).find(provider => provider.title === 'Uit');
			if (terrainProviderOff && get(map.options.selectedTerrainProvider) !== terrainProviderOff) {
				map.options.selectedTerrainProvider.set(terrainProviderOff);
			}
		}
	}


	// Note: we dont use the built-in scene switcher because it sucks
	function to2D() {
		if (map) {
			// Get the center of the screen
			var screenPosition = new Cesium.Cartesian2(
				map.viewer.canvas.clientWidth / 2,
				map.viewer.canvas.clientHeight / 2
			);

			// Get the point that we want to fly to
			let pickedPosition = map.viewer.camera.pickEllipsoid(screenPosition);

			// DEBUG: Show picked position
			// var point = map.viewer.entities.add({ position: pickedPosition, point: { pixelSize: 10, color: Cesium.Color.GREEN } });

			if (!pickedPosition) {
				console.warn("No position on globe found. Flying to home position instead.");
				const home = Cesium.Cartesian3.fromDegrees(
										map.startPosition.x, 
										map.startPosition.y, 
										map.startPosition.z
									);

				map.viewer.camera.flyTo({
					destination: home, //todo: calculate better position with viewrectangle
					orientation: {
						heading: map.startPosition.heading,
						pitch: Cesium.Math.toRadians(-89.9)
					},
					duration: map.startPosition.duration
				});
			}
			else {
				// Set the height to the start position height
				let cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
				cartographic.height = map.startPosition.z;
				let destination = Cesium.Cartographic.toCartesian(cartographic);

				map.viewer.camera.flyTo({
					destination: destination,
					orientation: {
						pitch: Cesium.Math.toRadians(-89.9)
					},
					duration: 1
				});
				// Disable tilt controls
				map.viewer.scene.screenSpaceCameraController.enableTilt = false;
			}
		}
		// Turn off terrain
		const terrainProviderOff = get(map.options.terrainProviders).find(provider => provider.title === 'Uit');
		if (terrainProviderOff && get(map.options.selectedTerrainProvider) !== terrainProviderOff) {
			map.options.selectedTerrainProvider.set(terrainProviderOff);
		}
	}

	function to3D() {
		if (map) {
			map.viewer.camera.flyTo({
				destination: map.viewer.camera.position,
				orientation: {
					pitch: Cesium.Math.toRadians(-80.0)
				},
				duration: 0.5
			});
			map.viewer.scene.screenSpaceCameraController.enableTilt = true;
		}
	}
</script>



<div class="mode-switcher">
	<Toggle
		id="toggle-3d-mode"
		size="sm"
		bind:toggled={$use3Dmode}
		disabled={$disableModeSwitcher}
	>
		<span slot="labelA" style="color: white">2D</span>
		<span slot="labelB" style="color: green">3D</span>
	</Toggle>
</div>

<style>
	.mode-switcher {
		justify-content: right;
		margin-left: 10px;
		margin-right: 32px;
	}
</style>
