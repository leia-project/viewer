<script lang="ts">
	import { Button, Dropdown, Loading, Slider, Toggle } from "carbon-components-svelte";
	import * as Cesium from "cesium";
	import { onDestroy } from "svelte";

	import type { FloodLayer } from "../module/layers/flood-layer";
	import { _ } from "svelte-i18n";
	import { get, writable, type Writable } from "svelte/store";
	import { ArrowLeft, ArrowRight, Pause, Play } from "carbon-icons-svelte";
	import type { Map } from "../module/map";
	import { MapMeasurementFloodDepth } from "./map-measurement-flood-depth";
	import ErrorMessage from "$lib/components/ui/components/ErrorMessage/ErrorMessage.svelte";
	import { OgcFeaturesLayer } from "../module/layers/ogc-features-layer";
	import { LayerConfig } from "$lib/components/map-core/layer-config";
	// import addFloodedRoadsLayer from "$lib/components/map-cesium/MapToolFlooding/MapToolFlooding.svelte";

	
	export let layer: FloodLayer;
	export let map: Map;
	export let showGlobeOpacitySlider: boolean = true;
	
	let { timeSliderValue, timeSliderMin, timeSliderMax, timeSliderStep, opacity, loaded, error } = layer;
	

	let playing: boolean = false;
	let intervalId: NodeJS.Timeout

	let previouseAnimateState: boolean

	let enableMeasurement = writable<boolean>(false);
	let measurementId: number = 0;
	let measurements: Writable<Array<MapMeasurementFloodDepth>> = writable<Array<MapMeasurementFloodDepth>>(
		new Array<MapMeasurementFloodDepth>()
	);
	let movingPoint: Cesium.Entity | undefined;
	
	let roadsLayer: OgcFeaturesLayer | undefined;

	$: globeOpacity = map.options.globeOpacity;
	
	function addFloodedRoadsLayer(timestep: number) {
        if (roadsLayer) {
            map.removeLayer(roadsLayer);
        }

        const layerConfig = new LayerConfig({
            id: "flooded_roads",
            title: "Wegen",
            type: "ogc-features",
            settings: {
                url: `http://localhost:5000`,
                options: {
                    collectionId: "nwb_floods",
                    heightStartLoading: 50000,
                    maxFeatures: 100000,
                    tileWidth: 40640
                },
                parameters: {
                    scenario: "26_NzSch-dp_160_300",
                    timestep: (timestep * 6).toString(),
                    limit: "1420"
                }
            },
            isBackground: false,
            defaultOn: true,
            defaultAddToManager: false
        });

        roadsLayer = new OgcFeaturesLayer(map, layerConfig);
        roadsLayer.addToMap();
    
		console.log("Changed roadsLayer from $timeSliderValue")
	}

	$: {
        if ($timeSliderValue !== undefined) {
            addFloodedRoadsLayer($timeSliderValue);
        }
    }
	onDestroy(() => {
        if (roadsLayer) {
            map.removeLayer(roadsLayer);
        }
    });
	// This doesn't work without a "$:" prefix, which causes each step to add additional subscriptions so I added a manual change
	// layer.timeSliderValue.subscribe((value) => {
	// 	if (value !== $timeSliderValue) {
	// 		$timeSliderValue = value;
	// 	}
	// 	console.log($timeSliderValue, timeSliderValue)
	// });


	function togglePlay() {
		playing = !playing;
		if (playing) {
			intervalId = setInterval(() => {
				layer.timeSliderValue.update((value) => {
				if (value >= $timeSliderMax) {
					playing = false;
					clearInterval(intervalId);
					return $timeSliderMin;
				}
				$timeSliderValue = value + $timeSliderStep;
				return value + $timeSliderStep;
				});
			}, 1000);
		} else {
			if (intervalId !== null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
  	}

	let leftClickHandle = (m: any) => {
		createFloodMeasurement(getCartesian2(m));
	};

	let moveHandle = (m: any) => {
		const picked = map.viewer.scene.pick(m);
		if (picked?.primitive?.type === "flood") {
			drawPointMove(getCartesian2(m));
		} else if (movingPoint != undefined) {
			removeMovingPoint();
		}
	};


	function getCartesian2(m: any): Cesium.Cartesian2 {
		return new Cesium.Cartesian2(m.x, m.y);
	}

	function removeMovingPoint() {
		if (!movingPoint) return;

		map.viewer.entities.remove(movingPoint);
		movingPoint = undefined;
	}

	function addMovingPoint(position: Cesium.Cartesian3) {
		movingPoint = map.viewer.entities.add({
			position: position,
			point: {
				show: true,
				color: Cesium.Color.BLUE,
				pixelSize: 10,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 1
			}
		});
	}

	function createFloodMeasurement(location: Cesium.Cartesian2) {
		const picked = map.viewer.scene.pickPosition(location);
		const measurement = addMeasurement();
		measurement.addPoint(picked);

		// add point on terrain
		let pickedCartographic = Cesium.Cartographic.fromCartesian(picked);
		Cesium.sampleTerrainMostDetailed(map.viewer.terrainProvider, [pickedCartographic]).then((result) => {
			measurement.addPoint(Cesium.Cartographic.toCartesian(result[0]));
		});
	}

	function drawPointMove(location: Cesium.Cartesian2) {
		const picked = map.viewer.scene.pickPosition(location);
		if (!movingPoint) addMovingPoint(picked);
		// @ts-ignore
		movingPoint.position = new Cesium.ConstantPositionProperty(picked);
	}

	function addMeasurement() {
		const newMeasurement = new MapMeasurementFloodDepth(measurementId, map);
		$measurements.push(newMeasurement);
		measurements.set($measurements);
		measurementId++;
		return newMeasurement;
	}

	function activate() {
		map.on("mouseLeftClick", leftClickHandle);
		map.on("mouseMove", moveHandle);
		previouseAnimateState = get(map.options.animate);
		map.options.animate.set(true);
	}

	function deactivate() {
		map.off("mouseLeftClick", leftClickHandle);
		map.off("mouseMove", moveHandle);
		// remove all measurements
		$measurements.forEach((measurement) => {
			measurement?.remove();
		});
		removeMovingPoint();
		map.options.animate.set(previouseAnimateState);

		map.refresh();
	}

	enableMeasurement.subscribe((enable) => {
		if (!enable) {
			deactivate();
		} else {
			activate();
		}
	});

</script>
{#if !$loaded}
	<div class="loading-wrapper">
		<Loading withOverlay={false} small />
	</div>
{:else if $error}
	<div class="loading-wrapper">
		<ErrorMessage message={$_("tools.flooding.errorCouldNotLoad")} />
	</div>
{:else}
	<div class="control-section">
		<div class="wrapper">
			{#if showGlobeOpacitySlider}
				<Slider
					hideTextInput
					labelText={$_("tools.backgroundControls.opacity") + " " + $globeOpacity + "%"}
					min={0}
					max={100}
					bind:value={$globeOpacity}
					step={1}
				/>
			{/if}
		</div>
		<div class="wrapper">
			<Slider 
				value={$opacity}
				labelText={$_('tools.flooding.waterTransparency') + ' ' + $opacity + '%'} 
				fullWidth={true} 
				on:input={(e) => {
					layer.opacity.set(e.detail);
				}}
				hideTextInput={true} 
				min={0} 
				max={100} 
				step={1} 
				minLabel={"0"} 
				maxLabel={"100"}
			/>
		</div>
		<div class="label-01">Time slider</div>
		<div class="wrapper">
			<Slider 
				bind:value={$timeSliderValue}
				labelText={String($timeSliderValue) + " uur sinds bres"} 
				fullWidth={true} 
				on:input={(e) => {
					layer.timeSliderValue.set(e.detail);
				}}
				hideTextInput={true} 
				min={$timeSliderMin} 
				max={$timeSliderMax} 
				step={$timeSliderStep} 
				minLabel={String($timeSliderMin)} 
				maxLabel={String($timeSliderMax)}
			/>
		</div>
		<div class="wrapper" style="display: flex; justify-content: center; gap: 4px;">
			<!-- Decrease time slider value by step -->
			<Button 
				kind="secondary" 
				size="small" 
				icon="{ArrowLeft}"
				iconDescription={$_('tools.animation.previous')}
				on:click={() => {
					// After switching scenario or breach, the Slider no longer listens to layer.timeSliderValue, so #timeSliderValue must be updated manually
					layer.timeSliderValue.update((value) => {$timeSliderValue -= 1; return value - $timeSliderStep});	
					// layer.timeSliderValue.update((value) => value - $timeSliderStep);	
				}}
			/>
			{#if !playing}
				<Button 
					kind="secondary"
					size="small" 
					icon="{Play}"
					iconDescription={$_('tools.animation.play')}
					on:click={() => {
						togglePlay();
					}}
				/>
			{:else}
				<Button 
					kind="secondary"
					size="small" 
					icon="{Pause}"
					iconDescription={$_('tools.animation.pause')}
					on:click={() => {
						togglePlay();
					}}
				/>	
			{/if}
			<!-- Increase time slider value by step -->
			<Button 
				kind="secondary"
				size="small" 
				icon="{ArrowRight}"
				iconDescription={$_('tools.animation.next')}
				on:click={() => {
					// After switching scenario or breach, the Slider no longer listens to layer.timeSliderValue, so #timeSliderValue must be updated manually
					layer.timeSliderValue.update((value) => {$timeSliderValue += 1; return value + $timeSliderStep});
					// layer.timeSliderValue.update((value) => value + $timeSliderStep);	
				}}
			/>
		</div>
	</div>
	<div class="measure">
		<div class="measure-checkbox">
			<span class="label-02">{$_("tools.flooding.measureDepth")}</span>
			<Toggle
				toggled={$enableMeasurement}
				hideLabel={true}
				on:toggle={() => {
					$enableMeasurement = !$enableMeasurement;
				}}
				labelA={$_("general.off")}
				labelB={$_("general.on")}
			/>
		</div>
	</div>
{/if}

<style>
	.loading-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		margin: var(--cds-spacing-05) 0;
	}
	.wrapper {
		margin-bottom: 8px;
	}
	.control-section {
		margin: 15px 0;
		position: relative;
	}

	.measure {
		margin: 10px 0 15px;
		background-color: var(--cds-ui-01);
		border-radius: 5px;
		border: 1px solid var(--cds-ui-03);
	}
	.measure-checkbox {
		display: flex;
		align-items: center;
		column-gap: 20px;
		padding-left: 10px;
	}
	.label-02 {
		padding: 15px 0;
	}

</style>