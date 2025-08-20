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
	const show = measure.show;

	const hoveredNode = roadNetwork.hoveredNode;

	function hover(h: boolean): void {
		hoveredNode.set(h ? measure : undefined);
	}

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
{#if $show}
	<div class="measure-entry" on:mouseenter={() => hover(true)} on:mouseleave={() => hover(false)} class:hovered={$hoveredNode === measure}>
		<div class="apply-toggle" class:toggleEnabled={$toggleEnabled} 
			on:click={() => {
				if ($toggleEnabled) applied.set(!$applied);
			}
		}>
			{#if $applied}
				<CheckmarkFilled color="#30e630" />
			{:else}
				<CloseFilled color="#de2f10" />
			{/if}
		</div>
		<div class="measure-details">
			<div class="measure-type">{$_(`game.measureTypes.${measure.config.type}`)}</div>
			<div class="measure-name">{measure.config.name}</div>
		</div>
		<GameButton
			size={15}
			icon={ZoomIn}
			hasTooltip={false}
			borderHighlight={false}
			on:click={() => measure.flyTo()}
		/>
	</div>
{/if}


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
		filter: brightness(70%);
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

	.hovered .measure-name {
		color: var(--game-color-highlight);
	}

</style>