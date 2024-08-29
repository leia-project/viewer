<script lang="ts">
	import { Button, Dropdown, Slider, TextInput } from "carbon-components-svelte";
	import * as Cesium from "cesium";

	import type { FloodLayer } from "../module/layers/flood-layer";
	import { _ } from "svelte-i18n";
	import { get, writable, type Writable } from "svelte/store";

	export let layer: FloodLayer;

	let { timeSliderValue } = layer;
</script>

<div class="control-section">
	<div class="control-header">Time slider</div>
	<div class="wrapper">
		<Slider 
			value={$timeSliderValue}
			labelText={$timeSliderValue} 
			fullWidth={true} 
			on:input={(e) => {
				layer.timeSliderValue.set(e.detail);
			}}
			hideTextInput={true} 
			min={layer.timeSliderMin} 
			max={layer.timeSliderMax} 
			step={layer.timeSliderStep} 
			minLabel={String(layer.timeSliderMin)} 
			maxLabel={String(layer.timeSliderMax)}
		/>
	</div>
</div>

<style>

	.geojson-styling-options {
		margin: 15px 0;
	}
	.control-header {
		margin-bottom: 8px;
	}
	.control-section {
		margin: 15px 0;
		position: relative;
	}
	.legend-item {
		display: grid;
		grid-template-columns: 20px 1fr;
		grid-gap: 10px;
		margin-top: 6px;
	}
	.legend-color {
		height: 100%;
		width: 100%;
		border: 1px solid #000;
		border-radius: 4px;
	}

	.color-randomizer {
		position: absolute;
		top: 0;
		right: 10px;
		width: 20px;
	}

	.color-gradient-header {
		margin: 15px 0 10px;
	}
	.color-gradient-setter {
		display: grid;
		grid-template-columns: 1fr 30px;
	}
	.color-gradient-input-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	.color-bar {
		height: 15px;
	}

</style>