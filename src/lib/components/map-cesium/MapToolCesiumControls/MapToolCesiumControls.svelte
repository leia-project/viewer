<script lang="ts">
	import { getContext } from "svelte";
	import { writable } from "svelte/store";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import Divider from "$lib/components/ui/components/Divider/Divider.svelte";

	import { Button, Checkbox } from "carbon-components-svelte";
	import { Slider } from "carbon-components-svelte";

	import { _ } from "svelte-i18n";

	import {
		RadioButtonGroup,
		RadioButton,
		DatePicker,
		DatePickerInput
	} from "carbon-components-svelte";
	import Settings from "carbon-icons-svelte/lib/Settings.svelte";

	import {
		Accordion,
		AccordionItem
	} from "carbon-components-svelte";

	import type { Map } from "../module/map";
	import type { Writable } from "svelte/store";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let id: string = "cesiumcontrols";
	export let icon: any = Settings;
	export let showOnBottom: boolean = true;

	export let label: string;
	export let textSunPosition: string;
	export let textSunPositionDate: string;
	export let textSunPositionHour: string;
	export let textQuality: string;
	export let textRendering: string;
	export let textEnvironment: string;
	export let textDebug: string;
	export let textLow: string;
	export let textMedium: string;
	export let textHigh: string;
	export let textCustom: string;
	export let textShadows: string;
	export let textFXAA: string;
	export let textMSAA: string;
	export let textAnimate: string;
	export let textResolutionScale: string;
	export let textMaximumScreenspaceError: string;
	export let textGroundAtmosphere: string;
	export let textSkyAtmosphere: string;
	export let textLighting: string;
	export let textFog: string;
	export let textHighDynamicRange: string;
	export let textPointCloud: string;
	export let textPointCloudAttenuation: string;
	export let textPointCloudAttenuationMaximum: string;
	export let textPointCloudAttenuationErrorScale: string;
	export let textPointCloudAttenuationBaseResolution: string;
	export let textPointCloudEDL: string;
	export let textPointCloudEDLRadius: string;
	export let textPointCloudEDLStrength: string;
	export let textFPSCounter: string;
	export let textInspector: string;
	export let textMouseCoordinates: string;
	export let textEnableDragDropFiles: string;
	export let textAdvanced: string;

	$: label = $_("tools.cesium.label");
	$: textSunPosition = $_("tools.cesium.sunPosition");
	$: textSunPositionDate = $_("tools.cesium.sunPositionDate");
	$: textSunPositionHour = $_("tools.cesium.sunPositionHour");
	$: textQuality = $_("tools.cesium.quality");
	$: textRendering = $_("tools.cesium.rendering");
	$: textEnvironment = $_("tools.cesium.environment");
	$: textDebug = $_("tools.cesium.debug");
	$: textLow = $_("tools.cesium.low");
	$: textMedium = $_("tools.cesium.medium");
	$: textHigh = $_("tools.cesium.high");
	$: textCustom = $_("tools.cesium.custom");
	$: textShadows = $_("tools.cesium.shadows");
	$: textFXAA = $_("tools.cesium.fxaa");
	$: textMSAA = $_("tools.cesium.msaa");
	$: textAnimate = $_("tools.cesium.animate");
	$: textResolutionScale = $_("tools.cesium.resolutionScale");
	$: textMaximumScreenspaceError = $_("tools.cesium.maximumScreenspaceError");
	$: textGroundAtmosphere = $_("tools.cesium.groundAtmosphere");
	$: textSkyAtmosphere = $_("tools.cesium.skyAtmosphere");
	$: textLighting = $_("tools.cesium.lighting");
	$: textFog = $_("tools.cesium.fog");
	$: textHighDynamicRange = $_("tools.cesium.dynamicRange");
	$: textPointCloud = $_("tools.cesium.pointCloud");
	$: textPointCloudAttenuation = $_("tools.cesium.pointCloudAttenuation");
	$: textPointCloudAttenuationMaximum = $_("tools.cesium.pointCloudAttenuationMaximum");
	$: textPointCloudAttenuationErrorScale = $_("tools.cesium.pointCloudAttenuationErrorScale");
	$: textPointCloudAttenuationBaseResolution = $_("tools.cesium.pointCloudAttenuationBaseResolution");
	$: textPointCloudEDL = $_("tools.cesium.pointCloudEDL");
	$: textPointCloudEDLRadius = $_("tools.cesium.pointCloudEDLRadius");
	$: textPointCloudEDLStrength = $_("tools.cesium.pointCloudEDLStrength");
	$: textFPSCounter = $_("tools.cesium.FPSCounter");
	$: textInspector = $_("tools.cesium.inspector");
	$: textMouseCoordinates = $_("tools.cesium.coordinates");
	$: textEnableDragDropFiles = $_("tools.cesium.dragAndDropFiles");
	$: textAdvanced = $_("tools.cesium.advanced");

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
	</div>
	
		<Accordion>
			<AccordionItem title={textRendering}>
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
			</AccordionItem>

		<AccordionItem title={textEnvironment}>
			<Checkbox labelText={textAnimate} bind:checked={$animate} />
			<Checkbox labelText={textShadows} bind:checked={$shadows} />
			<Checkbox labelText={textLighting} bind:checked={$lighting} />
			<Checkbox labelText={textGroundAtmosphere} bind:checked={$groundAtmosphere} />
			<Checkbox labelText={textSkyAtmosphere} bind:checked={$skyAtmosphere} />
			<Checkbox labelText={textFog} bind:checked={$fog} />
			<Checkbox labelText={textHighDynamicRange} bind:checked={$highDynamicRange} />
		</AccordionItem>

		<AccordionItem title={textDebug}>
			<Checkbox labelText={textFPSCounter} bind:checked={$fpsCounter} />
			<Checkbox labelText={textInspector} bind:checked={$inspector} />
			<Checkbox labelText={textMouseCoordinates} bind:checked={$showMouseCoordinates} />
			<Checkbox labelText="Camera position" bind:checked={$showCameraPosition} />
			<Checkbox labelText={textEnableDragDropFiles} bind:checked={$enableDragDropFiles} />
		</AccordionItem>

		<AccordionItem title={textPointCloud}>
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
