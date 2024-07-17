<script lang="ts">
	import { Button, Dropdown, Slider, TextInput } from "carbon-components-svelte";
	import ColorPalette from "carbon-icons-svelte/lib/ColorPalette.svelte";
	import * as Cesium from "cesium";

	import type { GeoJSONpropertySummary, GeoJsonLayer } from "../module/layers/geojson-layer";
	import { _ } from "svelte-i18n";
	import { get, writable, type Writable } from "svelte/store";

	export let layer: GeoJsonLayer;
	export let properties: Array<GeoJSONpropertySummary>;
	export let defaultStyle: string;

	let { extrusionSliderHeight, extrusionSliderLabel } = layer;

	function getDropdownList(): Array<{id: number; text: string}> {
		const items = [{
			id: 0,
			text: defaultStyle
		}];
		for (let i=0; i<properties.length; i++) {
			items.push({
				id: i + 1,
				text: properties[i].propertyName
			});
		}
		return items;
	}
	let dropdownItems = getDropdownList();
	let activeStyle = dropdownItems.find((item) => item.text === get(layer.style))?.id ?? 0;

	$: legend = layer.legend;
	$: styleType = layer.styleType;
	$: extrusionSliderLabelFull = ($extrusionSliderHeight >= 0 ? '+' : '') + $extrusionSliderHeight 
		+ ' ' + (extrusionSliderLabel ? extrusionSliderLabel : $_('tools.layerManager.metersNAP') )

	let colorGradientStart = layer.colorGradientStart.toCssHexString();
	let colorGradientEnd = layer.colorGradientEnd.toCssHexString();
	let invalidStartColor = false;
	let invalidEndColor = false;

	function checkIfValidColor(color: any): boolean {
		if (typeof color !== "string") return false;
		const newColor = Cesium.Color.fromCssColorString(color);
		return !newColor;
	}
</script>


{#if dropdownItems}
	<div class="geojson-styling-options">
		<div class="control-section">
			<div class="control-header">{ $_('tools.layerManager.styling') }</div>
			<Dropdown
				bind:selectedId={activeStyle}
				items={dropdownItems}
				size="sm"
				on:select={(e) => layer.style.set(e.detail.selectedItem.text)}
			></Dropdown>
		</div>

		{#if layer.tools.includes("extrude")}
			<div class="control-section">
				<div class="control-header">{ $_('tools.layerManager.extrusion') }</div>
				<div class="wrapper">
					<Slider 
						value={$extrusionSliderHeight}
						labelText={extrusionSliderLabelFull} 
						fullWidth={true} 
						on:change={(e) => {
							layer.extrusionSliderHeight.set(e.detail);
						}}
						hideTextInput={true} 
						min={layer.extrusionSliderMin} 
						max={layer.extrusionSliderMax} 
						step={layer.extrusionSliderStep} 
						minLabel={String(layer.extrusionSliderMin)} 
						maxLabel={String(layer.extrusionSliderMax)}
					/>
				</div>
			</div>
		{/if}
		
		{#if $legend && $legend.length > 0}
			<div class="control-section">
				<div class="control-header">{ $_('tools.layerManager.legend') }</div>
				<div>
					{#each $legend as item}
						<div class="legend-item">
							<div class="legend-color" style="background-color: {item.color}"></div>
							<div class="legend-text">{item.label}</div>
						</div>
					{/each}
					{#if $legend.length >= layer.maxLengthLegend}
						<div class="legend-item">
							<div class="legend-color" style="background-color: #c6c6c6"></div>
							<div class="legend-text">All other</div>
						</div>
					{/if}
				</div>
				{#if $styleType === "string"}
					<div class="color-randomizer">
						<Button
							iconDescription="Color randomizer"
							icon={ColorPalette}
							tooltipPosition="left"
							size="small"
							on:click={() => layer.setStyle(dropdownItems[activeStyle].text)}
						/>
					</div>
				{/if}
				{#if $styleType === "number"}
					<div class="color-gradient-header">{ $_('tools.layerManager.gradient') }</div>
					<div class="color-gradient-setter">
						<div class="color-gradient-input">
							<div class="color-gradient-input-fields">
								<TextInput
									size="sm"
									bind:value={colorGradientStart}
									invalid={invalidStartColor}
									on:input={(e) => invalidStartColor = checkIfValidColor(e.detail)}
								/>
								<TextInput
									size="sm"
									bind:value={colorGradientEnd}
									invalid={invalidEndColor}
									on:input={(e) => invalidEndColor = checkIfValidColor(e.detail)}
								/>
							</div>
							<div class="color-bar" style="background: linear-gradient(to right, {colorGradientStart}, {colorGradientEnd})"></div>
						</div>
						<div class="color-gradient-apply-button">
							<Button
								iconDescription="{ $_('tools.layerManager.applyGradient') }"
								icon={ColorPalette}
								tooltipPosition="left"
								size="small"
								on:click={() => {
									if (invalidStartColor || invalidEndColor) return;
									layer.colorGradientStart = Cesium.Color.fromCssColorString(colorGradientStart);
									layer.colorGradientEnd = Cesium.Color.fromCssColorString(colorGradientEnd);
									console.log(layer);
									layer.setStyle(dropdownItems[activeStyle].text)
								}}
							/>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

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