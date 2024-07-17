<script lang="ts">
	import { getContext } from "svelte";
	import { writable } from "svelte/store";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import Divider from "$lib/components/ui/components/Divider/Divider.svelte";

	import { Button, Checkbox } from "carbon-components-svelte";
	import { Slider } from "carbon-components-svelte";

	import {
		RadioButtonGroup,
		RadioButton,
		DatePicker,
		DatePickerInput
	} from "carbon-components-svelte";
	import Settings from "carbon-icons-svelte/lib/Settings.svelte";

	import type { Map } from "../module/map";
	import type { Writable } from "svelte/store";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let id: string = "cesiumcontrols";
	export let icon: any = Settings;
	export let label: string = "Map Settings";
	export let showOnBottom: boolean = true;

	export let textSunPosition: string = "Sun Position";
	export let textSunPositionDate: string = "Date";
	export let textSunPositionHour: string = "Hour UTC";

	export let textQuality: string = "Quality";
	export let textRendering: string = "Rendering";
	export let textEnvironment: string = "Environment";
	export let textDebug: string = "Debug";

	export let textLow: string = "Low";
	export let textMedium: string = "Medium";
	export let textHigh: string = "High";
	export let textCustom: string = "Custom";

	export let textShadows: string = "Shadows";
	export let textFXAA: string = "FXAA";
	export let textMSAA: string = "MSAA";
	export let textAnimate: string = "Animate";

	export let textResolutionScale: string = "Resolution Scale";
	export let textMaximumScreenspaceError: string = "Maximum Screenspace Error";
	export let textGroundAtmosphere: string = "Ground Atmosphere";
	export let textSkyAtmosphere: string = "Sky Atmosphere";
	export let textLighting: string = "Lighting";
	export let textFog: string = "Fog";
	export let textHighDynamicRange: string = "High Dynamic Range";

	export let textPointCloud: string = "Point Clouds";

	export let textPointCloudAttenuation: string = "Attenuation";
	export let textPointCloudAttenuationMaximum: string = "Attenuation Maximum";
	export let textPointCloudAttenuationErrorScale: string = "Attenuation Geometric Error Scale";
	export let textPointCloudAttenuationBaseResolution: string = "Attenuation Base resolution";

	export let textPointCloudEDL: string = "Eye Dome Lighting";
	export let textPointCloudEDLRadius: string = "Eye Dome Lighting Radius";
	export let textPointCloudEDLStrength: string = "Eye Dome Lighting Strength";

	export let textFPSCounter: string = "FPS Counter";
	export let textInspector: string = "Tile Inspector";
	export let textMouseCoordinates: string = "Coordinates";

	export let textEnableDragDropFiles: string = "Drag and drop files";

	export let cesiumMap: Map = map;

	let updatingSettings: boolean = true;
	let selectedPerformance: Writable<string> = writable<string>("medium");
	let showMouseCoordinates: Writable<boolean> = writable<boolean>(false);	
	let showCameraPosition: Writable<boolean> = writable<boolean>(false);	

	$: dateTime = cesiumMap.options.dateTime;
	$: fxaa = cesiumMap.options.fxaa;
	$: msaa = cesiumMap.options.msaa;
	$: shadows = cesiumMap.options.shadows;
	$: animate = cesiumMap.options.animate;
	$: resolutionScale = cesiumMap.options.resolutionScale;
	$: maximunScreenSpaceError = cesiumMap.options.maximumScreenSpaceError;
	$: groundAtmosphere = cesiumMap.options.groundAtmosphere;
	$: lighting = cesiumMap.options.lighting;
	$: skyAtmosphere = cesiumMap.options.skyAtmosphere;
	$: fog = cesiumMap.options.fog;
	$: highDynamicRange = cesiumMap.options.highDynamicRange;
	$: fpsCounter = cesiumMap.options.fpsCounter;

	$: pointCloudAttenuation = cesiumMap.options.pointCloudAttenuation;
	$: pointCloudAttenuationMaximum = cesiumMap.options.pointCloudAttenuationMaximum;
	$: pointCloudAttenuationBaseResolution = cesiumMap.options.pointCloudAttenuationBaseResolution;
	$: pointCloudAttenuationErrorScale = cesiumMap.options.pointCloudAttenuationErrorScale;

	$: pointCloudEdl = cesiumMap.options.pointCloudEDL;
	$: pointCloudEDLRadius = cesiumMap.options.pointCloudEDLRadius;
	$: pointCloudEDLStrength = cesiumMap.options.pointCloudEDLStrength;

	$: inspector = cesiumMap.options.inspector;
	$: showMouseCoordinates = cesiumMap.options.showMouseCoordinates;
	$: showCameraPosition = cesiumMap.options.showCameraPosition;

	$: enableDragDropFiles = cesiumMap.options.enableDragDropFiles;

	cesiumMap.options.fxaa.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.msaa.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.shadows.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.animate.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.resolutionScale.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.maximumScreenSpaceError.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.groundAtmosphere.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.lighting.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.skyAtmosphere.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.fog.subscribe(() => {
		setCustom();
	});
	cesiumMap.options.highDynamicRange.subscribe(() => {
		setCustom();
	});

	let tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: {
		tool.label.set(label);
	}
	registerTool(tool);

	selectedPerformance.subscribe((p) => {
		if (p === "custom") {
			return;
		}

		updatingSettings = true;

		if (p === "low") {
			cesiumMap.options.fxaa.set(false);
			cesiumMap.options.msaa.set(1);
			cesiumMap.options.shadows.set(false);
			cesiumMap.options.animate.set(false);
			cesiumMap.options.resolutionScale.set(0.8);
			cesiumMap.options.maximumScreenSpaceError.set(1.5);
			cesiumMap.options.groundAtmosphere.set(false);
			cesiumMap.options.lighting.set(true);
			cesiumMap.options.skyAtmosphere.set(true);
			cesiumMap.options.fog.set(false);
			cesiumMap.options.highDynamicRange.set(false);
		} else if (p === "medium") {
			cesiumMap.options.fxaa.set(true);
			cesiumMap.options.msaa.set(1);
			cesiumMap.options.shadows.set(false);
			cesiumMap.options.animate.set(false);
			cesiumMap.options.resolutionScale.set(1);
			cesiumMap.options.maximumScreenSpaceError.set(1.2);
			cesiumMap.options.groundAtmosphere.set(true);
			cesiumMap.options.lighting.set(true);
			cesiumMap.options.skyAtmosphere.set(true);
			cesiumMap.options.fog.set(true);
			cesiumMap.options.highDynamicRange.set(false);
		} else if (p === "high") {
			cesiumMap.options.fxaa.set(true);
			cesiumMap.options.msaa.set(8);
			cesiumMap.options.shadows.set(true);
			cesiumMap.options.animate.set(false);
			cesiumMap.options.resolutionScale.set(1);
			cesiumMap.options.maximumScreenSpaceError.set(1.0);
			cesiumMap.options.groundAtmosphere.set(true);
			cesiumMap.options.lighting.set(true);
			cesiumMap.options.skyAtmosphere.set(true);
			cesiumMap.options.fog.set(true);
			cesiumMap.options.highDynamicRange.set(false);
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
		cesiumMap.options.dateTime.set(current.getTime());
	}

	function changeDate(dateString: string): void {
		const [day, month, year] = dateString.split('/');
		const dateObject = new Date(Date.UTC(+year, parseInt(month) - 1, +day));
		dateObject.setUTCHours(hour);

		cesiumMap.options.dateTime.set(dateObject.getTime());
	}
</script>

{#if $selectedTool === tool}
	<div class="wrapper">
		<div class="heading-01">
			{textSunPosition}
		</div>

		<Slider
			hideTextInput
			fullWidth
			min={0}
			max={23}
			step={1}
			labelText={`${textSunPositionHour}: ${hour}`}
			value={hour}
			on:change={(e) => {
				changeHour(e.detail);
			}}
		/>

		<DatePicker
			datePickerType="single"
			on:change={(e) => {
				changeDate(e.detail.dateStr);
			}}
			dateFormat="d/m/Y"
			value={$dateTime}
		>
			<DatePickerInput labelText={textSunPositionDate} placeholder="dd/mm/yyyy" />
		</DatePicker>

		<div class="heading-01">
			{textQuality}
		</div>

		<RadioButtonGroup orientation="vertical" bind:selected={$selectedPerformance}>
			<RadioButton labelText={textLow} value="low" />
			<RadioButton labelText={textMedium} value="medium" />
			<RadioButton labelText={textHigh} value="high" />
			<RadioButton labelText={textCustom} value="custom" />
		</RadioButtonGroup>

		<Divider />
		<div class="heading-01">
			{textRendering}
		</div>

		<Checkbox labelText={textFXAA} bind:checked={$fxaa} />

		<Slider
			hideTextInput
			fullWidth
			min={1}
			max={8}
			step={1}
			labelText={`${textMSAA}: ${$msaa}`}
			bind:value={$msaa}
		/>
		<Slider
			hideTextInput
			fullWidth
			min={0.1}
			max={4}
			step={0.1}
			labelText={`${textResolutionScale}: ${$resolutionScale.toFixed(1)}`}
			bind:value={$resolutionScale}
		/>
		<Slider
			hideTextInput
			fullWidth
			min={1}
			max={3}
			step={0.1}
			labelText={`${textMaximumScreenspaceError}: ${$maximunScreenSpaceError.toFixed(1)}`}
			bind:value={$maximunScreenSpaceError}
		/>

		<Divider />

		<div class="heading-01">
			{textEnvironment}
		</div>

		<Checkbox labelText={textAnimate} bind:checked={$animate} />
		<Checkbox labelText={textShadows} bind:checked={$shadows} />
		<Checkbox labelText={textLighting} bind:checked={$lighting} />
		<Checkbox labelText={textGroundAtmosphere} bind:checked={$groundAtmosphere} />
		<Checkbox labelText={textSkyAtmosphere} bind:checked={$skyAtmosphere} />
		<Checkbox labelText={textFog} bind:checked={$fog} />
		<Checkbox labelText={textHighDynamicRange} bind:checked={$highDynamicRange} />

		<Divider />
		<div class="heading-01">
			{textDebug}
		</div>

		<Checkbox labelText={textFPSCounter} bind:checked={$fpsCounter} />
		<Checkbox labelText={textInspector} bind:checked={$inspector} />
		<Checkbox labelText={textMouseCoordinates} bind:checked={$showMouseCoordinates} />		
		<Checkbox labelText="Camera position" bind:checked={$showCameraPosition} />	
		<Checkbox labelText={textEnableDragDropFiles} bind:checked={$enableDragDropFiles} />

		<Divider />
		<div class="heading-01">{textPointCloud}</div>

		<Checkbox labelText={textPointCloudAttenuation} bind:checked={$pointCloudAttenuation} />
		<Checkbox labelText={textPointCloudEDL} bind:checked={$pointCloudEdl} />

		{#if $pointCloudAttenuation}
			<Slider
				hideTextInput
				fullWidth
				min={0}
				max={2}
				step={0.1}
				labelText={`${textPointCloudAttenuationErrorScale}: ${$pointCloudAttenuationErrorScale.toFixed(
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
				labelText={`${textPointCloudAttenuationMaximum}: ${$pointCloudAttenuationMaximum.toFixed(
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
				labelText={`${textPointCloudAttenuationBaseResolution}: ${$pointCloudAttenuationBaseResolution.toFixed(
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
				labelText={`${textPointCloudEDLStrength}: ${$pointCloudEDLStrength.toFixed(1)}`}
				bind:value={$pointCloudEDLStrength}
			/>
			<Slider
				hideTextInput
				fullWidth
				min={0}
				max={10}
				step={0.1}
				labelText={`${textPointCloudEDLRadius}: ${$pointCloudEDLRadius.toFixed(1)}`}
				bind:value={$pointCloudEDLRadius}
			/>
		{/if}
	</div>
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
