<script lang="ts">
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { getContext } from "svelte";
	import { get, writable } from "svelte/store";
	import { Toggle } from "carbon-components-svelte";

	import type { Map } from "../../module/map";


	const { app } = getContext<any>("page");
	$: map = get(app.map) as Map;

	let use3Dmode = true;

	// Note: we dont use the built in scene switcher because it sucks
	function to2D() {
		// map.viewer.scene.morphTo2D(2);
		if (map) {
			map.viewer.camera.setView({
				orientation: {
					pitch: Cesium.Math.toRadians(-90.0)
				},
			});
			map.viewer.scene.screenSpaceCameraController.enableTilt = false;
		}
		//switch terrain provider to default?
		map.options.selectedTerrainProvider.set(
			{
			title: get(map.options.terrainProviders[0].title),
			url: get(map.options.terrainProviders[0].url),
			vertexNormals: get(map.options.terrainProviders[0].vertexNormals)
			}
		);
		
		
	}

	function to3D() {
		// map.viewer.scene.morphTo3D(2);
		if (map) {
			map.viewer.scene.screenSpaceCameraController.enableTilt = true;
		}
	}

</script>

<div class="mode-switcher">
	<Toggle
		id="toggle-3d-mode"
		size="sm"
		bind:toggled={use3Dmode}
		on:change={() => {
			console.log("toggle status:", use3Dmode);
			use3Dmode ? to3D() : to2D();
		}}
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
