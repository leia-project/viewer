<script lang="ts">
	import { UserFilled, ZoomIn } from "carbon-icons-svelte";
	import type { Evacuation } from "../../../module/game-elements/evacuation";
	import GameButton from "../../general/GameButton.svelte";

	export let evacuation: Evacuation;

</script>


<!-- svelte-ignore a11y-no-noninteractive-element-interactions a11y-click-events-have-key-events -->
<li class="evacuation-entry">
	<span class="col">{evacuation.hexagon.hex}</span>
	<span class="col">{evacuation.extractionPoint.id}</span>
	<span class="col evacuation-count">
		<UserFilled />
		<span>{evacuation.numberOfPersons}</span>
	</span>
	<GameButton
		icon={ZoomIn}
		size={16}
		hasTooltip={false}
		borderHighlight={true}
		on:click={(e) => {
			e.stopPropagation();
			evacuation.toggle();
		}}
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