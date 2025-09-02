<script lang="ts">
	import { createEventDispatcher, onDestroy } from "svelte";
	import { derived } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { TrashCan, UserFilled, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";
	import type { Map } from "../../../external-dependencies";
	import GameButton from "../../general/GameButton.svelte";
	import type { EvacuationGroup } from "../../../module/game-elements/evacuation-controller";

	export let evacuationGroup: EvacuationGroup;
	export let map: Map;

	const shown = derived(evacuationGroup.evacuations.map(e => e.shown), $shown => $shown.some(s => s));

	const numberOfPersons = evacuationGroup.evacuations.reduce((sum, evacuation) => sum + evacuation.numberOfPersons, 0);

	const dispatch = createEventDispatcher();

	function onMouseEnter(): void {
		evacuationGroup.evacuations.forEach((evacuation) => {
			evacuation.route.forEach((segment) => segment.highlight(true));
		});
		evacuationGroup.hexagon.highlight("hover");
		map.refresh();
	}

	function onMouseLeave(): void {
		evacuationGroup.evacuations.forEach((evacuation) => {
			evacuation.route.forEach((segment) => segment.highlight(false));
		});
		evacuationGroup.hexagon.unhighlight("hover");
		map.refresh();
	}

	onDestroy(() => {
		onMouseLeave();
	});

</script>


<!-- svelte-ignore a11y-no-noninteractive-element-interactions a11y-click-events-have-key-events -->
<li class="evacuation-entry" on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave}>
	<Button
		kind="danger"
		icon={TrashCan}
		size="small"
		iconDescription={$_("game.buttons.delete")}
		tooltipPosition="right"
		on:click={() => dispatch("delete")}
	/>
	<div class="col">
		<span class="text-ellipsis">{evacuationGroup.hexagon.name}</span>
	</div>
	<div class="col">
		<span class="text-ellipsis">{evacuationGroup.extractionPoint.feature.properties.name}</span>
	</div>
	<div class="col evacuation-count">
		<UserFilled />
		<span>{numberOfPersons}</span>
	</div>
	<GameButton
		icon={$shown ? ViewFilled : ViewOffFilled}
		size={16}
		hasTooltip={false}
		borderHighlight={true}
		active={$shown}
		on:click={() => evacuationGroup.evacuations.forEach(evacuation => evacuation.toggle(evacuationGroup.evacuations))}
	/>
</li>


<style>

	.evacuation-entry {
		display: grid;
		grid-template-columns: auto 140px 140px 80px auto;
		column-gap: 0.5rem;
		justify-content: space-between;
		margin-bottom: 4px;
	}

	.col {
		display: flex;
		align-items: center;
	}

	.text-ellipsis {
		display: block;
		overflow: hidden;
	    white-space: nowrap;
		text-overflow: ellipsis;
	}

	.evacuation-count {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

</style>