<script lang="ts">
	import type { Writable } from "svelte/store";
	import { HexagonVerticalOutline } from "carbon-icons-svelte";
	import type { Map } from "$lib/components/map-cesium/module/map";
	import type { Hexagon } from "../../module/game-elements/hexagons/hexagon";
	import type { EvacuationController } from "../../module/game-elements/evacuation-controller";
	import InfoBox from "./InfoBox.svelte";
	import MarvinInfoBoxAddOn from "./MarvinInfoBoxAddOn.svelte";
	import EvacuateAction from "../data/evacuation-overview/EvacuateAction.svelte";

	export let hexagon: Hexagon;
	export let store: Writable<Hexagon | undefined>;
	export let selectStore: Writable<Hexagon | undefined> | undefined = undefined;
	export let timeout: NodeJS.Timeout | undefined;
	export let map: Map;
	export let type: "hover" | "selected";
	export let evacuationController: EvacuationController;

	const evacuated = hexagon.totalEvacuated;

	const marvinQuestions: Array<string> = [
		"Which places and cities are in this area?",
		"What is the population of this hexagon?",
		"How many people have been evacuated from this hexagon?"
	];

</script>


<InfoBox
	item={hexagon}
	{store}
	{timeout}
	{map}
	{type}
	icon={HexagonVerticalOutline}
	{selectStore}
>
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
	<div class="hexagon-info-box">
		<div>
			<div>Population: {hexagon.population}</div>
			<div>Evacuated: {$evacuated}</div>
		</div>
		{#if type === "selected"}
			<MarvinInfoBoxAddOn
				{evacuationController}
				questions={marvinQuestions}
				geoJSON={{
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [hexagon.getHexVertices()]
					}
				}}
			/>
		{/if}
	</div>
	<EvacuateAction
		{hexagon}
		{evacuationController}
		selected={type === "selected"}
	/>
</InfoBox>


<style>

	.hexagon-info-box {
		display: flex;
		justify-content: space-between;
		column-gap: 2.5rem;
		color: var(--game-color-highlight)
	}

</style>