<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Game } from "../../../module/game";
	import MeasureEntry from "./MeasureEntry.svelte";
	import BaseLayer from "../../layer-manager/BaseLayer.svelte";

	export let game: Game;

	const roadNetwork = game.evacuationController.roadNetwork;
	
</script>


<div class="layer-control">
	<BaseLayer
		visible={roadNetwork.measureToggled}
		title={$_("game.measures")}
	/>
</div>

<div class="measure-list">
	{#each roadNetwork.measures as measure}
		<MeasureEntry {measure} {roadNetwork} />
	{/each}
</div>


<style>

	.layer-control {
		border-bottom: 1px solid var(--game-color-highlight);
		padding: 0.4rem 0;
		margin-bottom: 1rem;
		font-size: 1.5rem !important;
	}

	.measure-list {
		display: flex;
		flex-direction: column;
		row-gap: 0.3rem;
		padding-bottom: 0.75rem;
	}

</style>