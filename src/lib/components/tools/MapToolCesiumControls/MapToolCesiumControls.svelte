<script lang="ts">
	import { getContext } from "svelte";
	import { writable, type Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import {
		Checkbox,
		Slider,
		Accordion,
		AccordionItem,
		RadioButtonGroup,
		RadioButton,
		DatePicker,
		DatePickerInput
	} from "carbon-components-svelte";
	import { Settings } from "carbon-icons-svelte";

	import type { Map } from "$lib/map-cesium/map";
	import { MapToolMenuOption } from "../MapToolMenuOption";

	const { registerTool, selectedTool } = getContext<any>("mapTools");

	export let id: string = "cesiumcontrols";
	export let icon: any = Settings;
	export let showOnBottom: boolean = true;
	export let map: Map;

	let tool = new MapToolMenuOption(id, icon, "", showOnBottom);
	$: {
		tool.label.set($_("tools.cesium.label"));
	}
	registerTool(tool);


	let updatingSettings: boolean = true;
	let selectedPerformance: Writable<string> = writable<string>("medium");
	let showMouseCoordinates: Writable<boolean> = writable<boolean>(false);	
	let showCameraPosition: Writable<boolean> = writable<boolean>(false);	

	$: dateTime = map.options.dateTime;
	$: fxaa = map.options.fxaa;
	$: msaa = map.options.msaa;
	$: shadows = map.options.shadows;
	$: animate = map.options.animate;
	$: resolutionScale = map.options.resolutionScale;
	$: maximunScreenSpaceError = map.options.maximumScreenSpaceError;
	$: groundAtmosphere = map.options.groundAtmosphere;
	$: lighting = map.options.lighting;
	$: skyAtmosphere = map.options.skyAtmosphere;
	$: fog = map.options.fog;
	$: highDynamicRange = map.options.highDynamicRange;
	$: fpsCounter = map.options.fpsCounter;

	$: pointCloudAttenuation = map.options.pointCloudAttenuation;
	$: pointCloudAttenuationMaximum = map.options.pointCloudAttenuationMaximum;
	$: pointCloudAttenuationBaseResolution = map.options.pointCloudAttenuationBaseResolution;
	$: pointCloudAttenuationErrorScale = map.options.pointCloudAttenuationErrorScale;

	$: pointCloudEdl = map.options.pointCloudEDL;
	$: pointCloudEDLRadius = map.options.pointCloudEDLRadius;
	$: pointCloudEDLStrength = map.options.pointCloudEDLStrength;

	$: inspector = map.options.inspector;
	$: showMouseCoordinates = map.options.showMouseCoordinates;
	$: showCameraPosition = map.options.showCameraPosition;

	$: enableDragDropFiles = map.options.enableDragDropFiles;

	map.options.fxaa.subscribe(() => {
		setCustom();
	});
	map.options.msaa.subscribe(() => {
		setCustom();
	});
	map.options.shadows.subscribe(() => {
		setCustom();
	});
	map.options.animate.subscribe(() => {
		setCustom();
	});
	map.options.resolutionScale.subscribe(() => {
		setCustom();
	});
	map.options.maximumScreenSpaceError.subscribe(() => {
		setCustom();
	});
	map.options.groundAtmosphere.subscribe(() => {
		setCustom();
	});
	map.options.lighting.subscribe(() => {
		setCustom();
	});
	map.options.skyAtmosphere.subscribe(() => {
		setCustom();
	});
	map.options.fog.subscribe(() => {
		setCustom();
	});
	map.options.highDynamicRange.subscribe(() => {
		setCustom();
	});

	selectedPerformance.subscribe((p) => {
		if (p === "custom") {
			return;
		}

		updatingSettings = true;

		if (p === "low") {
			map.options.fxaa.set(false);
			map.options.msaa.set(1);
			map.options.shadows.set(false);
			map.options.animate.set(false);
			map.options.resolutionScale.set(0.8);
			map.options.maximumScreenSpaceError.set(1.5);
			map.options.groundAtmosphere.set(false);
			map.options.lighting.set(true);
			map.options.skyAtmosphere.set(true);
			map.options.fog.set(false);
			map.options.highDynamicRange.set(false);
		} else if (p === "medium") {
			map.options.fxaa.set(true);
			map.options.msaa.set(1);
			map.options.shadows.set(false);
			map.options.animate.set(false);
			map.options.resolutionScale.set(1);
			map.options.maximumScreenSpaceError.set(1.2);
			map.options.groundAtmosphere.set(true);
			map.options.lighting.set(true);
			map.options.skyAtmosphere.set(true);
			map.options.fog.set(true);
			map.options.highDynamicRange.set(false);
		} else if (p === "high") {
			map.options.fxaa.set(true);
			map.options.msaa.set(8);
			map.options.shadows.set(true);
			map.options.animate.set(false);
			map.options.resolutionScale.set(1);
			map.options.maximumScreenSpaceError.set(1.0);
			map.options.groundAtmosphere.set(true);
			map.options.lighting.set(true);
			map.options.skyAtmosphere.set(true);
			map.options.fog.set(true);
			map.options.highDynamicRange.set(false);
		}

		setTimeout(() => {
			updatingSettings = false;
		}, 500);
	});

	function setCustom() {
		if (updatingSettings === false) {
			selectedPerformance.set("custom");
		}
	}

	$: hour = new Date($dateTime).getUTCHours();

	function changeHour(hours: number): void {
		const current = new Date($dateTime);
		current.setUTCHours(hours);
		map.options.dateTime.set(current.getTime());
	}

	function changeDate(dateString: string): void {
		const [day, month, year] = dateString.split('/');
		const dateObject = new Date(Date.UTC(+year, parseInt(month) - 1, +day));
		dateObject.setUTCHours(hour);

		map.options.dateTime.set(dateObject.getTime());
	}

</script>

{#if $selectedTool === tool}
	<div class="wrapper">
		<div class="heading-01">
			{$_("tools.cesium.sunPosition")}
		</div>

		<Slider
			hideTextInput
			fullWidth
			min={0}
			max={23}
			step={1}
			labelText={`${$_("tools.cesium.sunPositionHour")}: ${hour}`}
			value={hour}
			on:change={(e) => {
				changeHour(e.detail);
			}}
		/>

		<DatePicker
			datePickerType="single"
			on:change={(e) => {
				changeDate(
					typeof e.detail === "string" ? e.detail : 
					typeof e.detail.dateStr === "string" ? e.detail.dateStr : 
					e.detail.dateStr.from
				);
			}}
			dateFormat="d/m/Y"
			value={$dateTime}
		>
			<DatePickerInput labelText={$_("tools.cesium.sunPositionDate")} placeholder="dd/mm/yyyy" />
		</DatePicker>

		<div class="heading-01">
			{$_("tools.cesium.quality")}
		</div>

		<RadioButtonGroup orientation="vertical" bind:selected={$selectedPerformance}>
			<RadioButton labelText={$_("tools.cesium.low")} value="low" />
			<RadioButton labelText={$_("tools.cesium.medium")} value="medium" />
			<RadioButton labelText={$_("tools.cesium.high")} value="high" />
			<RadioButton labelText={$_("tools.cesium.custom")} value="custom" />
		</RadioButtonGroup>
	</div>
	
	<Accordion>
		<AccordionItem title={$_("tools.cesium.rendering")}>
		<Checkbox labelText={$_("tools.cesium.fxaa")} bind:checked={$fxaa} />

			<Slider
				hideTextInput
				fullWidth
				min={1}
				max={8}
				step={1}
				labelText={`${$_("tools.cesium.msaa")}: ${$msaa}`}
				bind:value={$msaa}
			/>
			<Slider
				hideTextInput
				fullWidth
				min={0.1}
				max={4}
				step={0.1}
				labelText={`${$_("tools.cesium.resolutionScale")}: ${$resolutionScale.toFixed(1)}`}
				bind:value={$resolutionScale}
			/>
			<Slider
				hideTextInput
				fullWidth
				min={1}
				max={3}
				step={0.1}
				labelText={`${$_("tools.cesium.maximumScreenspaceError")}: ${$maximunScreenSpaceError.toFixed(1)}`}
				bind:value={$maximunScreenSpaceError}
			/>
		</AccordionItem>

		<AccordionItem title={$_("tools.cesium.environment")}>
			<Checkbox labelText={$_("tools.cesium.animate")} bind:checked={$animate} />
			<Checkbox labelText={$_("tools.cesium.shadows")} bind:checked={$shadows} />
			<Checkbox labelText={$_("tools.cesium.lighting")} bind:checked={$lighting} />
			<Checkbox labelText={$_("tools.cesium.groundAtmosphere")} bind:checked={$groundAtmosphere} />
			<Checkbox labelText={$_("tools.cesium.skyAtmosphere")} bind:checked={$skyAtmosphere} />
			<Checkbox labelText={$_("tools.cesium.fog")} bind:checked={$fog} />
			<Checkbox labelText={$_("tools.cesium.highDynamicRange")} bind:checked={$highDynamicRange} />
		</AccordionItem>

		<AccordionItem title={$_("tools.cesium.debug")}>
			<Checkbox labelText={$_("tools.cesium.fpsCounter")} bind:checked={$fpsCounter} />
			<Checkbox labelText={$_("tools.cesium.inspector")} bind:checked={$inspector} />
			<Checkbox labelText={$_("tools.cesium.mouseCoordinates")} bind:checked={$showMouseCoordinates} />
			<Checkbox labelText={$_("tools.cesium.cameraPosition")} bind:checked={$showCameraPosition} />
			<Checkbox labelText={$_("tools.cesium.dragAndDropFiles")} bind:checked={$enableDragDropFiles} />
		</AccordionItem>

		<AccordionItem title={$_("tools.cesium.pointCloud")}>
			<Checkbox labelText={$_("tools.cesium.pointCloudAttenuation")} bind:checked={$pointCloudAttenuation} />
			<Checkbox labelText={$_("tools.cesium.pointCloudEDL")} bind:checked={$pointCloudEdl} />

				{#if $pointCloudAttenuation}
					<Slider
						hideTextInput
						fullWidth
						min={0}
						max={2}
						step={0.1}
						labelText={`${$_("tools.cesium.pointCloudAttenuationErrorScale")}: ${$pointCloudAttenuationErrorScale.toFixed(
							1
						)}`}
						bind:value={$pointCloudAttenuationErrorScale}
					/>

					<Slider
						hideTextInput
						fullWidth
						min={0}
						max={30}
						step={1}
						labelText={`${$_("tools.cesium.pointCloudAttenuationMaximum")}: ${$pointCloudAttenuationMaximum.toFixed(
							1
						)}`}
						bind:value={$pointCloudAttenuationMaximum}
					/>

					<Slider
						hideTextInput
						fullWidth
						min={0}
						max={10}
						step={0.2}
						labelText={`${$_("tools.cesium.pointCloudAttenuationBaseResolution")}: ${$pointCloudAttenuationBaseResolution.toFixed(
							1
						)}`}
						bind:value={$pointCloudAttenuationBaseResolution}
					/>
				{/if}

				{#if $pointCloudEdl}
					<Slider
						hideTextInput
						fullWidth
						min={0}
						max={10}
						step={0.1}
						labelText={`${$_("tools.cesium.pointCloudEDLStrength")}: ${$pointCloudEDLStrength.toFixed(1)}`}
						bind:value={$pointCloudEDLStrength}
					/>
					<Slider
						hideTextInput
						fullWidth
						min={0}
						max={10}
						step={0.1}
						labelText={`${$_("tools.cesium.pointCloudEDLRadius")}: ${$pointCloudEDLRadius.toFixed(1)}`}
						bind:value={$pointCloudEDLRadius}
					/>
				{/if}
		</AccordionItem>
	</Accordion>
{/if}

<style>
	.wrapper {
		width: 100%;
		padding: var(--cds-spacing-05);
	}

	.heading-01:not(:first-child) {
		margin-top: var(--cds-spacing-04);
		margin-bottom: var(--cds-spacing-04);
	}
</style>
