<script lang="ts">
	import { getContext, createEventDispatcher } from "svelte";
	import { get } from "svelte/store";
	import { TextInput, Button, DataTable } from "carbon-components-svelte";
	import Edit from "carbon-icons-svelte/lib/Edit.svelte";
	import Save from "carbon-icons-svelte/lib/Save.svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
	import View from "carbon-icons-svelte/lib/View.svelte";
	import ViewOff from "carbon-icons-svelte/lib/ViewOff.svelte";
	import Camera from "carbon-icons-svelte/lib/Camera.svelte";

	import type { Map } from "../module/map";
	import type { MapMeasurement } from "./map-measurement";
	import CarbonHeader from "$lib/components/ui/components/Header/CarbonHeader.svelte";

	export let editting: boolean = false;
	export let textEditMeasurement: string = "Edit Measurement";
	export let textTitle: string = "Title";
	export let textDefaultTitle: string = "Measurement";
	export let textSave: string = "Save";
	export let textRecord: string = "Set camera position to current view";
	export let textDelete: string = "Delete";
	export let textCameraPosition: string = "Camera position";
	export let textTotalLength: string = "Total length";
	export let textMeasurementPoints: string = "Measurement Points";
	export let measurement: MapMeasurement;

	const editDispatch = createEventDispatcher<{ requestEdit: number }>();
	const cancelEditDispatch = createEventDispatcher<{ cancelEdit: number }>();
	const deleteDispatch = createEventDispatcher<{ requestDelete: number }>();

	const { map } = getContext<any>("mapTools");
	const cesiumMap: Map = map;

	const dtHeadersPoints = [
		{ key: "id", value: "Id" },
		{ key: "interval", value: "Distance" },
		{ key: "remove", value: "" }
	];

	const dtHeadersCamera = [
		{ key: "property", value: "Property" },
		{ key: "value", value: "Value" }
	];

	$: length = measurement.totalLength;
	$: points = measurement.points;
	$: visible = measurement.visible;
	$: displayLength = $length > 1000 ? `${($length / 1000).toFixed(3)} KM` : `${$length} M`;
	$: dtRowsPoints = $points.map((p, i) => {
		return {
			id: i,
			interval: formatDistance(measurement.getDistanceToPrevious(i)),
			remove: i
		};
	});

	let dtRowsCamera = new Array<any>();

	measurement.cameraLocation.subscribe((c) => {
		if (!c) return;

		const dtEntries = new Array<any>();

		dtEntries.push({
			id: 0,
			property: "X",
			value: c.x.toFixed(4)
		});

		dtEntries.push({
			id: 1,
			property: "Y",
			value: c.y.toFixed(4)
		});

		dtEntries.push({
			id: 2,
			property: "Z",
			value: c.z.toFixed(4)
		});

		dtEntries.push({
			id: 3,
			property: "Heading",
			value: c.heading.toFixed(4)
		});

		dtEntries.push({
			id: 4,
			property: "Pitch",
			value: c.pitch.toFixed(4)
		});

		dtRowsCamera = dtEntries;
	});

	$: if (editting) {
		startEdit();
	} else {
		cancelEdit();
	}

	function formatDistance(value: number): string {
		return value ? `${value.toFixed(2)} M` : `-`;
	}

	function saveMeasurement() {
		if (!measurement.title) {
			measurement.title = textDefaultTitle;
		}

		cancelEditDispatch("cancelEdit", measurement.id);
	}

	function deleteMeasurement() {
		deleteDispatch("requestDelete", measurement.id);
	}

	export function startEdit() {
		const location = get(measurement.cameraLocation);
		measurement.showEdit();

		if (!location) {
			setCameraPosition();
		}
	}

	export function cancelEdit() {
		measurement.hideEdit();
		saveMeasurement();
	}

	function setCameraPosition() {
		measurement.cameraLocation.set(cesiumMap.getPosition());
	}

	function zoomToCameraPosition() {
		measurement.zoomToLocation();
	}

	function lookAt(index: number) {
		measurement.lookAt(index);
	}
</script>

<div class="measurement">
	{#if editting}
		<div class="measurement-content">
			<div class="heading-01">
				{textEditMeasurement}
			</div>
			<TextInput
				size="sm"
				labelText={textTitle}
				bind:value={measurement.title}
				placeholder="Enter title"
			/>
			<div class="heading label-01">{textTotalLength}</div>

			<div class="label-02">
				{displayLength}
			</div>

			{#if dtRowsPoints.length > 0}
				<div class="heading label-01">{textMeasurementPoints}</div>

				<DataTable size="compact" headers={dtHeadersPoints} rows={dtRowsPoints} on:click:row={(evt) => {lookAt(evt.detail.id)}}>
					<svelte:fragment slot="cell" let:row let:cell>
						{#if cell.key === "remove"}
							<Button size="small" kind="ghost" iconDescription="Remove" icon={TrashCan} on:click={()=> {measurement.removePoint(cell.value)}} />
						{:else}
							{cell.value}
						{/if}
					</svelte:fragment>
				</DataTable>
			{/if}

			<div class="heading label-01">{textCameraPosition}</div>
			<div class="label-02">
				<DataTable size="compact" headers={dtHeadersCamera} rows={dtRowsCamera}  />
			</div>

			<div class="measurement-content-buttons">
				<div class="left">
					<Button
						kind="danger"
						on:click={() => {
							deleteMeasurement();
						}}
						iconDescription={textDelete}
						icon={TrashCan}
					/>
				</div>

				<div class="right">
					<Button
						on:click={() => {
							setCameraPosition();
						}}
						iconDescription={textRecord}
						icon={Camera}
					/>
					<Button
						on:click={() => {
							saveMeasurement();
						}}
						iconDescription={textSave}
						icon={Save}
					/>
				</div>
			</div>
		</div>
	{:else}
		<div class="measurement-header">
			<div class="visibility">
				<Button
					kind="ghost"
					iconDescription="Show"
					icon={$visible ? View : ViewOff}
					on:click={(e) => {
						e.preventDefault();
						if ($visible) {
							measurement.hide();
						} else {
							measurement.show();
						}
					}}
				/>
			</div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="measurement-title"
				on:click={() => {
					zoomToCameraPosition();
				}}
				role="button"
				tabindex="0"
			>
				<div class="label-02 ">
					{measurement.title}
				</div>
				<div class="label-01">
					{displayLength}
				</div>
			</div>
			<Button
				iconDescription="Edit"
				icon={Edit}
				on:click={() => {
					editDispatch("requestEdit", measurement.id);
				}}
			/>
		</div>
	{/if}
</div>

<style>
	.heading {
		padding-top: var(--cds-spacing-05);
	}

	.measurement {
		width: 100%;
	}

	.measurement-header:hover {
		background-color: var(--cds-ui-01);
		color: var(--tosti-color-text-secondary);
		transition: 0.2s;
	}

	.measurement-header {
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		align-content: center;
	}

	.measurement-title {
		padding-left: var(--cds-spacing-05);
		flex-grow: 1;
	}

	.measurement-content {
		width: 100%;
	}

	.measurement-content-buttons {
		width: 100%;
		display: flex;
		justify-content: space-between;
		padding-top: var(--cds-spacing-05);
		gap: var(--cds-spacing-01);
	}

	.visibility {
		flex-shrink: 1;
	}
</style>
