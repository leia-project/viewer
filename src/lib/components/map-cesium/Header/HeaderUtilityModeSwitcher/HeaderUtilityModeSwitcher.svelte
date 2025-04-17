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
	let ready = false;

	onMount(() => {
		const unsubscribe = use3Dmode.subscribe((b) => {
			if (ready) {
				b ? to3D() : to2D();
			} else {
				ready = true;
			}
		});

		return () => {
			unsubscribe();
		};
	});
	
	// Note: we dont use the built-in scene switcher because it sucks
	function to2D() {
		if (map) {
			map.viewer.camera.flyTo({
				destination: map.viewer.camera.position, //todo: calculate better position with viewrectangle
				orientation: {
					pitch: Cesium.Math.toRadians(-90.0)
				},
				duration: 1.5
			});
			map.viewer.scene.screenSpaceCameraController.enableTilt = false;
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
					pitch: Cesium.Math.toRadians(-34.0)
				},
				duration: 1.5
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
