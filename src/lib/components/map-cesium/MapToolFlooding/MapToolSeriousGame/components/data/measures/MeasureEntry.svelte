<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Measure } from "../../../module/game-elements/roads/measure";
	import { CheckmarkFilled, CloseFilled, ZoomIn } from "carbon-icons-svelte";
	import type { RoadNetwork } from "../../../module/game-elements/roads/road-network";
	import GameButton from "../../general/GameButton.svelte";

	export let measure: Measure;
	export let roadNetwork: RoadNetwork;

	const applied = measure.applied;
	const toggleEnabled = measure.toggleEnabled;

	function hover(h: boolean): void {
		roadNetwork.hoveredNode.set(h ? measure : undefined);
	}

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="measure-entry" on:mouseenter={() => hover(true)} on:mouseleave={() => hover(false)}>
	<div class="apply-toggle" class:toggleEnabled={$toggleEnabled} 
		on:click={() => {
			if ($toggleEnabled) applied.set(!$applied);
		}
	}>
		{#if $applied}
			<CheckmarkFilled color="green" />
		{:else}
			<CloseFilled color="red" />
		{/if}
	</div>
	<div class="measure-details">
		<div class="measure-type">{$_(`game.measureTypes.${measure.config.type}`)}</div>
		<div>{measure.config.name}</div>
	</div>
	<GameButton
		size={15}
		icon={ZoomIn}
		hasTooltip={false}
		borderHighlight={false}
		on:click={() => measure.flyTo()}
	/>
</div>


<style>

	.measure-entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
		column-gap: 1rem;
	}

	.apply-toggle {
		height: 100%;
		padding: 0.25rem;
	}

	.apply-toggle.toggleEnabled:hover {
		cursor: pointer;
		filter: brightness(200%);
	}

	.measure-details {
		display: grid;
		grid-template-columns: 75px 1fr;
		column-gap: 1rem;
		flex: 1;
	}

	.measure-type {
		color: var(--game-color-highlight);
		display: flex;
		align-items: center;
	}

</style>