<script lang="ts">
	import { _ } from "svelte-i18n";
	import { derived, type Readable } from "svelte/store";
	import { View } from "carbon-icons-svelte";
	import { Game } from "../../../module/game";
	import type { Evacuation } from "../../../module/game-elements/evacuation";
	import HexagonLayerControl from "../../layer-manager/HexagonLayerControl.svelte";
	import EvacuateAction from "./EvacuateAction.svelte";
	import GameButton from "../../general/GameButton.svelte";
	import type { EvacuationGroup } from "../../../module/game-elements/evacuation-controller";
	import HexagonEvacuationGroupEntry from "./HexagonEvacuationGroupEntry.svelte";

	export let game: Game;

	const selectedHexagon = game.evacuationController.hexagonLayer.selectedHexagon;
	const selectedExtractionPoint = game.evacuationController.roadNetwork.selectedExtractionPoint;
	const hexagonsLoaded = game.evacuationController.hexagonLayer.loaded;

	const elapsedTime = game.elapsedTime;
	const elapsedTimeSinceBreach = game.elapsedTimeSinceBreach;

	let evacuations: Readable<Array<Evacuation>>;
	let evacuationsGrouped: Readable<Array<EvacuationGroup>>;
	let currentEvacuationsGrouped: Readable<Array<EvacuationGroup>>;
	let showAllToggled: Readable<boolean>;
	$: if ($hexagonsLoaded) {
		evacuations = game.evacuationController.evacuations;
		evacuationsGrouped = game.evacuationController.evacuationsGrouped;
		currentEvacuationsGrouped = derived(evacuationsGrouped, $e => $e.filter(group => group.time === $elapsedTime));
		showAllToggled = derived($currentEvacuationsGrouped.flatMap(group => group.evacuations.map(evacuation => evacuation.shown)), $showns => 
			$showns.some(s => s)
		);
	}

	function toggleAllEvacuationsAggregated(): void {
		const display = !$showAllToggled;
		const allCurrentEvacuations = $currentEvacuationsGrouped.flatMap(group => group.evacuations);
		$currentEvacuationsGrouped.forEach((group) => {
			group.evacuations.forEach(evacuation => {
				evacuation.toggle(allCurrentEvacuations, display);
			});
		});
	}

	function deleteEvacuationGroup(evacuationGroup: EvacuationGroup): void {
		evacuationGroup.evacuations.forEach(evacuation => game.evacuationController.deleteEvacuation(evacuation));
	}

</script>


<HexagonLayerControl layer={game.evacuationController.hexagonLayer} />

<div class="divider"></div>

<div class="evacuation-create">
	<span class="point point-a">
		<span class="point-label">{$_("game.from")}</span>
		<span>
			{#if $selectedHexagon}
				<span>{$selectedHexagon.hex}</span>
			{:else}
				{$_("game.menu.noHexagonSelected")}
			{/if}
		</span>
	</span>
	<EvacuateAction
		hexagon={$selectedHexagon}
		evacuationController={game.evacuationController}
	/>
	<span class="point point-b">
		<span class="point-label">{$_("game.to")}</span>
		<span>
			{#if $selectedExtractionPoint}
				{$selectedExtractionPoint.feature.properties.name}
			{:else}
				{$_("game.menu.noExtractionPointSelected")}
			{/if}
		</span>
	</span>
</div>

<div class="divider"></div>

<div class="evacuation-list-header">
	<span>{$_("game.evacuations")} ({$currentEvacuationsGrouped.length})</span>
	<div class="step-title">
		{#if $currentEvacuationsGrouped.length > 0}
			<GameButton
				icon={View}
				size={14}
				hasTooltip={false}
				borderHighlight={true}
				active={$showAllToggled}
				buttonText={`T${$elapsedTimeSinceBreach >= 0 ? "+" : "-"} ${Math.abs($elapsedTimeSinceBreach)}`}
				on:click={toggleAllEvacuationsAggregated}
			/>
		{:else}
			<span class="step-pill">{`T${$elapsedTimeSinceBreach >= 0 ? "+" : "-"} ${Math.abs($elapsedTimeSinceBreach)} ${$_("game.hours")}`}</span>
		{/if}
	</div>
</div>
{#if $evacuationsGrouped.length > 0}
	<ul class="evacuation-list">
		{#each $evacuationsGrouped as evacuationGroup}
			{#if evacuationGroup.time === $elapsedTime}
				<HexagonEvacuationGroupEntry
					{evacuationGroup}
					on:delete={() => deleteEvacuationGroup(evacuationGroup)}
				/>
			{/if}
		{/each}
	</ul>
{:else}
	<p>{$_("game.menu.noEvacuationsInThisTimestep")}</p>
{/if}


<style>

	.divider {
		border-top: 1px solid lightslategray;
		margin: 1rem 0;
	}

	.evacuation-create {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		column-gap: 2rem;
		margin-bottom: 1rem;
	}

	.point-a {
		text-align: right;
	}

	.point-label {
		display: block;
		font-size: 0.8rem;
		color: var(--game-color-highlight);
	}

	.evacuation-list-header {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--game-color-highlight);
		margin-bottom: 0.5rem;	
		display: flex;
		justify-content: space-between;
	}

	.step-title {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.step-pill {
		background-color: var(--game-color-highlight);
		color: rgb(var(--game-color-bg));
		padding: 0.25rem 0.8rem;
		border-radius: 0.5rem;
	}

	.evacuation-list {
		max-height: 300px;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}
	.evacuation-list::-webkit-scrollbar {
		display: none;
	}

</style>