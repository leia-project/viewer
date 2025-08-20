<script lang="ts">
	import { derived } from "svelte/store";
	import { UserFilled, ViewFilled, ViewOffFilled } from "carbon-icons-svelte";
	import GameButton from "../../general/GameButton.svelte";
	import type { EvacuationGroup } from "../../../module/game-elements/evacuation-controller";

	export let evacuationGroup: EvacuationGroup;

	const shown = derived(evacuationGroup.evacuations.map(e => e.shown), $shown => $shown.some(s => s));

	const numberOfPersons = evacuationGroup.evacuations.reduce((sum, evacuation) => sum + evacuation.numberOfPersons, 0);

</script>


<!-- svelte-ignore a11y-no-noninteractive-element-interactions a11y-click-events-have-key-events -->
<li class="evacuation-entry">
	<span class="col">{evacuationGroup.hexagon.hex}</span>
	<span class="col">{evacuationGroup.extractionPoint.id}</span>
	<span class="col evacuation-count">
		<UserFilled />
		<span>{numberOfPersons}</span>
	</span>
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
		grid-template-columns: 150px 80px 80px auto;
		justify-content: space-between;
		margin-bottom: -1px;
	}

	.col {
		display: flex;
		align-items: center;
	}

	.evacuation-count {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

</style>