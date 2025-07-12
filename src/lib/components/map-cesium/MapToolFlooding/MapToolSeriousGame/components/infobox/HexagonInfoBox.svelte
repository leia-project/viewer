<script lang="ts">
	import type { Writable } from "svelte/store";
	import { Button } from "carbon-components-svelte";
	import { HexagonVerticalOutline } from "carbon-icons-svelte";
	import type { Map } from "$lib/components/map-cesium/module/map";
	import type { Hexagon } from "../../module/game-elements/hexagons/hexagon";
	import type { EvacuationController } from "../../module/game-elements/evacuation-controller";
	import InfoBox from "./InfoBox.svelte";
	import { QA } from "../../../Marvin/module/qa";
	import { NotificationType } from "$lib/components/map-core/notifications/notification-type";
	import { DrawnGeometry } from "../../../Marvin/module/draw/drawn-geometry";

	export let hexagon: Hexagon;
	export let store: Writable<Hexagon | undefined>;
	export let timeout: NodeJS.Timeout | undefined;
	export let map: Map;
	export let type: "hover" | "selected";
	export let evacuationController: EvacuationController;

	const evacuations = hexagon.evacuations;
	const evacuated = hexagon.totalEvacuated;
	const selectedExtractionPoint = evacuationController.roadNetwork.selectedExtractionPoint;

	function askMarvin(): void {
		const marvin = evacuationController.game.marvin;
		if (!marvin) {
			evacuationController.game.notificationLog.send({
				type: NotificationType.WARN,
				title: "Marvin error",
				message: "Marvin is not available.",
				duration: 5000
			});
			return;
		}
		const geom = new DrawnGeometry(hexagon.hex, {
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [hexagon.getHexVertices()]
			}
		});
		const qa = new QA(
			marvin,
			"which places and cities are in this area?",
			geom.getWkt()
		)
		marvin.qaManager.addEntry(qa);
		marvin.openMenu.set(true);
	}

</script>


<InfoBox
	item={hexagon}
	{store}
	{timeout}
	{map}
	{type}
	icon={HexagonVerticalOutline}
>		
	
	<div>Population: {hexagon.population}</div>
	<div>Evacuated: {$evacuated}</div>
	{#if type === "selected"}
		{#if $selectedExtractionPoint}
			<Button
				kind="primary"
				size="small"
				icon={HexagonVerticalOutline}
				on:click={() => evacuationController.evacuate(hexagon)}
			>Evacuate</Button>
		{:else}
			Select an extraction point to evacuate
		{/if}
	{/if}
	<Button
		kind="secondary"
		size="small"
		on:click={askMarvin}
	>Ask Marvin</Button>
</InfoBox>



<style>

</style>