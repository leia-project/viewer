<script lang="ts">
	import { getContext } from "svelte";
	import { get, writable, type Writable } from "svelte/store";
	import Divider from "$lib/components/ui/components/Divider/Divider.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import Ruler from "carbon-icons-svelte/lib/Ruler.svelte";
	import Add from "carbon-icons-svelte/lib/Add.svelte";
	import { Button, InlineNotification } from "carbon-components-svelte";

	import * as Cesium from "cesium";

	import type { Map } from "../module/map";
	import { MapMeasurement } from "./map-measurement";
	import MeasureEntry from "./MeasureEntry.svelte";

	const { registerTool, selectedTool, map, disableInteractionFromOtherTools, enableInteractionsFromOtherTools } = getContext<any>("mapTools");
	const id: string = "cesiummeasure";
	const icon: any = Ruler;
	const cesiumMap: Map = map;
	let loaded: boolean = false;

	export let label: string = "Measure";
	export let showOnBottom: boolean = false;
	export let textNoMeasurements: string = "No Measurements:";
	export let textNoMeasurementsSubtitle: string =
		"Click the add button to create a new measurement.";
	export let textAdd: string = "Add new measurement";

	export let textEditMeasurement: string = "Edit Measurement";
	export let textTitle: string = "Title";
	export let textDefaultTitle: string = "Measurement";
	export let textSave: string = "Save";
	export let textRecord: string = "Set camera position to current view";
	export let textDelete: string = "Delete";
	export let textCameraPosition: string = "Camera position";
	export let textTotalLength: string = "Total length";
	export let textMeasurementPoints: string = "Measurement Points";

	let tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }
	
	let measurementId: number = 0;
	let edittingId = writable<number | undefined>(undefined);
	let activeMeasurement = writable<MapMeasurement | undefined>(undefined);
	let movingPoint: Cesium.Entity | undefined;
	let previouseAnimateState: boolean;
	let measurements: Writable<Array<MapMeasurement>> = writable<Array<MapMeasurement>>(
		new Array<MapMeasurement>()
	);

	registerTool(tool);

	let leftClickHandle = (m: any) => {
		drawPoint(getCartesian2(m));
	};

	let moveHandle = (m: any) => {
		drawPointMove(getCartesian2(m));
	};

	selectedTool.subscribe((selected: MapToolMenuOption) => {
		if (selected !== tool && get(activeMeasurement)) {
			get(activeMeasurement)?.hideEdit();
			activeMeasurement.set(undefined);
		}
	});

	edittingId.subscribe((id) => {
		const newActiveMeasurement = id ? getMeasurementById(id) : undefined;
		activeMeasurement.set(newActiveMeasurement);
	});

	activeMeasurement.subscribe((measurement) => {
		if (!measurement) {
			deactivate();
		} else {
			activate();
		}
	});

	function deleteMeasurement(id: number) {
		const tempMeasurements = get(measurements);
		const index = tempMeasurements.findIndex((m) => {
			return m.id === id;
		});
		if (index !== -1) {
			tempMeasurements[index].remove();
			tempMeasurements.splice(index, 1);
		}

		measurements.set(tempMeasurements);
		activeMeasurement.set(undefined);

		saveLocal();
	}

	function getMeasurementById(id: number): MapMeasurement | undefined {
		for (let i = 0; i < $measurements.length; i++) {
			if ($measurements[i].id === id) {
				return $measurements[i];
			}
		}

		return undefined;
	}

	function getCartesian2(m: any): Cesium.Cartesian2 {
		return new Cesium.Cartesian2(m.x, m.y);
	}

	function activate() {
		disableInteractionFromOtherTools(id);
		previouseAnimateState = get(cesiumMap.options.animate);
		cesiumMap.on("mouseLeftClick", leftClickHandle);
		cesiumMap.on("mouseMove", moveHandle);
		cesiumMap.options.animate.set(true);
	}

	function deactivate() {
		enableInteractionsFromOtherTools();
		cesiumMap.off("mouseLeftClick", leftClickHandle);
		cesiumMap.off("mouseMove", moveHandle);

		removeMovingPoint();
		cesiumMap.options.animate.set(previouseAnimateState);
		edittingId.set(undefined);

		cesiumMap.refresh();
	}

	function removeMovingPoint() {
		if (!movingPoint) return;

		cesiumMap.viewer.entities.remove(movingPoint);
		movingPoint = undefined;
	}

	function addMovingPoint(position: Cesium.Cartesian3) {
		movingPoint = cesiumMap.viewer.entities.add({
			position: position,
			point: {
				show: true,
				color: Cesium.Color.RED,
				pixelSize: 10,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 1
			}
		});
	}

	function drawPoint(location: Cesium.Cartesian2) {
		const picked = cesiumMap.viewer.scene.pickPosition(location);
		$activeMeasurement?.addPoint(picked);
	}

	function drawPointMove(location: Cesium.Cartesian2) {
		const picked = cesiumMap.viewer.scene.pickPosition(location);
		if (!movingPoint) addMovingPoint(picked);
		// @ts-ignore
		movingPoint.position = new Cesium.ConstantPositionProperty(picked);
	}

	function addMeasurement() {
		edittingId.set(undefined);

		measurementId++;
		const newMeasurement = new MapMeasurement(measurementId, cesiumMap);
		$measurements.push(newMeasurement);
		measurements.set($measurements);
		edittingId.set(measurementId);
	}

	const storageLocation = "cesium.measure.measurements";
	measurements.subscribe((m) => {
		if (loaded && m) {
			saveLocal();
		}
	});

	cesiumMap.ready.subscribe((r) => {
		if (r) {
			loadFromLocalStorage();
			loaded = true;
		}
	});

	function saveLocal() {
		const tempMeasurements = get(measurements);
		const measurementObjects = new Array<any>();
		for (let i = 0; i < tempMeasurements.length; i++) {
			measurementObjects.push(tempMeasurements[i].toStorageObject());
		}

		localStorage.setItem(storageLocation, JSON.stringify(measurementObjects));
	}

	function loadFromLocalStorage() {
		const localStorageItems = localStorage.getItem(storageLocation);
		if (localStorageItems) {
			const objects = JSON.parse(localStorageItems);
			for (let i = 0; i < objects.length; i++) {
				measurementId++;
				const newMeasurement = new MapMeasurement(measurementId, cesiumMap);
				newMeasurement.fromStorage(objects[i]);
				$measurements.push(newMeasurement);				
			}
		}
	}
</script>

{#if $selectedTool === tool }
	<div class="wrapper">
		<div class="measurements">
			{#if $measurements.length == 0}
				<InlineNotification
					lowContrast
					hideCloseButton
					kind="info"
					title={textNoMeasurements}
					subtitle={textNoMeasurementsSubtitle}
				/>
			{:else}
				{#each $measurements as measurement}
					<div
						class:fade={$edittingId !== undefined && $edittingId !== measurement.id ? true : false}
					>
						<MeasureEntry
							bind:measurement
							on:requestEdit={(evt) => {
								edittingId.set(evt.detail);
							}}
							on:cancelEdit={() => {
								edittingId.set(undefined);
								saveLocal();
							}}
							on:requestDelete={(e) => {
								deleteMeasurement(e.detail);
							}}
							editting={$edittingId === measurement.id ? true : false}
							{textEditMeasurement}
							{textTitle}
							{textDefaultTitle}
							{textSave}
							{textRecord}
							{textDelete}
							{textCameraPosition}
							{textTotalLength}
							{textMeasurementPoints}
						/>
						<Divider />
					</div>
				{/each}
			{/if}
		</div>
		<div class="add">
			<Button
				on:click={() => {
					addMeasurement();
				}}
				iconDescription={textAdd}
				icon={Add}
				tooltipPosition="left"
				tooltipAlignment="end"
			/>
		</div>
	</div>
{/if}

<style>
	.wrapper {
		width: 100%;
		padding: var(--cds-spacing-05);
	}

	.add {
		padding-top: var(--cds-spacing-05);
		width: 100%;
		display: flex;
		justify-content: end;
	}

	.fade {
		opacity: 0.3;
	}
</style>
