<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Writable } from "svelte/store";
	import { HexagonVerticalOutline } from "carbon-icons-svelte";
	import type { Map } from "../../external-dependencies";
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


	const scenario = evacuationController.game.gameConfig.scenario;
	const timestep = evacuationController.elapsedTime;;

	const evacuated = hexagon.totalEvacuated;

	const marvinQuestions: Array<string> = [
		"Where is the closest medical service for area $h3_id?",


		// my own
		"What is the population of this hexagon?"
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
			<div class="hexagon-name">{hexagon.name}</div>
			<div class="hexagon-info">
				<span>{$_("game.inhabitants")}</span>
				<span>{hexagon.population.toLocaleString('nl-NL')}</span>
			</div>
			<div class="hexagon-info">
				<span>{$_("game.evacuated")}</span>
				<span>{$evacuated.toLocaleString('nl-NL')}</span>
			</div>
		</div>
		{#if type === "selected"}
			<MarvinInfoBoxAddOn
				game={evacuationController.game}
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
		column-gap: 1.5rem;
		color: var(--game-color-highlight);
	}

	.hexagon-name {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--game-color-highlight);
		margin-bottom: 0.25rem;
	}

	.hexagon-info {
		display: grid;
		grid-template-columns: 100px auto;
	}

</style>