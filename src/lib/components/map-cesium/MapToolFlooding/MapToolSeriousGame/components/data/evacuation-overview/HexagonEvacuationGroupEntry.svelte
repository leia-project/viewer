<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { derived } from "svelte/store";
	import { Button } from "carbon-components-svelte";
	import { TrashCan, UserFilled, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";
	import GameButton from "../../general/GameButton.svelte";
	import type { EvacuationGroup } from "../../../module/game-elements/evacuation-controller";

	export let evacuationGroup: EvacuationGroup;

	const shown = derived(evacuationGroup.evacuations.map(e => e.shown), $shown => $shown.some(s => s));

	const numberOfPersons = evacuationGroup.evacuations.reduce((sum, evacuation) => sum + evacuation.numberOfPersons, 0);

	const dispatch = createEventDispatcher();

</script>


<!-- svelte-ignore a11y-no-noninteractive-element-interactions a11y-click-events-have-key-events -->
<li class="evacuation-entry">
	<Button
		kind="danger"
		icon={TrashCan}
		size="small"
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