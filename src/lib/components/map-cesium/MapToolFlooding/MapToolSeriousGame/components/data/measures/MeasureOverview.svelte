<script lang="ts">
	import { get, derived, type Readable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import type { Game } from "../../../module/game";
	import MeasureEntry from "./MeasureEntry.svelte";
	import BaseLayer from "../../layer-manager/BaseLayer.svelte";
	import type { Measure } from "../../../module/game-elements/roads/measure";

	export let game: Game;

	const roadNetwork = game.evacuationController.roadNetwork;

	const enabledMeasures: Readable<Array<Measure>> = derived(roadNetwork.measures.map((m) => m.toggleEnabled), (enabledArray) => {
		return roadNetwork.measures.filter((measure, index) => enabledArray[index]);
	});
	const disabledMeasures: Readable<Array<Measure>> = derived(roadNetwork.measures.map((m) => m.toggleEnabled), (enabledArray) => {
		return roadNetwork.measures.filter((measure, index) => !enabledArray[index] && get(measure.show));
	});

	const inPreparationPhase = game.inPreparationPhase;
	
</script>


<div class="layer-control">
	<BaseLayer
		visible={roadNetwork.measureToggled}
		title={$_("game.measures")}
	/>
</div>

<div class="divider" />

<div class="measure-list">
	<div class="measure-list-title">{$_("game.available")}</div>
	{#each $enabledMeasures as measure}
		<MeasureEntry {measure} {roadNetwork} />
	{/each}
</div>

{#if $disabledMeasures.length > 0}
	<div class="divider" />

	<div class="measure-list">
		<div class="measure-list-title">{$_("game.unavailable")} in {$inPreparationPhase ? $_("game.preparationPhase") : $_("game.evacuationPhase")}</div>
		{#each $disabledMeasures as measure}
			<MeasureEntry {measure} {roadNetwork} />
		{/each}
	</div>
{/if}


<style>

	.divider {
		border-bottom: 1px solid lightslategray;
		margin: 1rem 0;
	}

	.layer-control {
		margin: 1rem 0;
		font-size: 1.5rem !important;
	}

	.measure-list {
		display: flex;
		flex-direction: column;
		row-gap: 0.3rem;
	}

	.measure-list-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--game-color-highlight);
		margin-bottom: 0.6rem;
	}

</style>