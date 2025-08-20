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

	//let selectedHour = $elapsedTime;
	//$: nextHour = game.getAdjacentStep(selectedHour, "next");
	//$: previousHour = game.getAdjacentStep(selectedHour, "previous");


	function toggleAllEvacuationsAggregated(): void {
		const display = !$showAllToggled;
		const allCurrentEvacuations = $currentEvacuationsGrouped.flatMap(group => group.evacuations);
		$currentEvacuationsGrouped.forEach((group) => {
			group.evacuations.forEach(evacuation => {
				evacuation.toggle(allCurrentEvacuations, display);
			});
		});
	}

</script>


<div class="evacuation-overview">
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
			<span class="point-label">{$_("game.from")}</span>
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
			{#if $evacuationsGrouped.length > 0}
				<GameButton
					icon={View}
					size={14}
					hasTooltip={false}
					borderHighlight={true}
					active={$showAllToggled}
					buttonText={`T+ ${$elapsedTimeSinceBreach}`}
					on:click={toggleAllEvacuationsAggregated}
				/>
			{:else}
				<span>{`T+ ${$elapsedTimeSinceBreach} ${$_("game.hours")}`}</span>
			{/if}
		</div>
		<!-- Navigation: Too confusing for users (?)
		<div class="step-nav">
			<div class="step-nav-button">
				{#if previousHour}
					<GameButton
						icon={PreviousFilled}
						size={14}
						hasTooltip={false}
						borderHighlight={true}
						active={nextHour !== undefined}
						on:click={() => selectedHour = previousHour}
					/>
				{/if}
			</div>
			<span class="step-title">{`T+ ${selectedHour - Game.breachStartOffsetInHours}`}</span>
			<div class="step-nav-button">
				{#if nextHour}
					<GameButton
						icon={NextFilled}
						size={14}
						hasTooltip={false}
						borderHighlight={true}
						active={nextHour !== undefined}
						on:click={() => selectedHour = nextHour}
					/>
				{/if}
			</div>
		</div>
		-->
	</div>
	{#if $evacuationsGrouped.length > 0}
		<ul class="evacuation-list">
			{#each $evacuationsGrouped as evacuationGroup}
				{#if evacuationGroup.time === $elapsedTime}
					<HexagonEvacuationGroupEntry {evacuationGroup} />
				{/if}
			{/each}
		</ul>
	{:else}
		<p>{$_("game.menu.noEvacuationsInThisTimestep")}</p>
	{/if}
</div>


<style>

	.evacuation-overview {
		padding-bottom: 1rem;
	}

	.divider {
		border-top: 1px solid lightslategray;
		margin: 1rem 1rem;
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

	.step-nav {
		display: grid;
		grid-template-columns: 30px 50px 30px;
		align-items: center;
		gap: 1rem;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.evacuation-list {
		max-height: 300px;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}

</style>