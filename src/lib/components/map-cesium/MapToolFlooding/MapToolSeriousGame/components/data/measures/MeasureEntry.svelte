<script lang="ts">
	import { Checkbox } from "carbon-components-svelte";
	import type { Measure } from "../../../module/game-elements/roads/measure";
	import { CheckmarkFilled, CloseFilled } from "carbon-icons-svelte";

	export let measure: Measure;

	const applied = measure.applied;

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="measure-entry">
	<div class="apply-toggle" on:click={() => applied.set(!$applied)}>
		<div class="apply-indicator">
			{#if $applied}
				<CheckmarkFilled color="green" />
			{:else}
				<CloseFilled color="red" />
			{/if}
		</div>
		<div>{measure.config.name}</div>
	</div>
	<div>{measure.config.type}</div>
</div>


<style>

	.measure-entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
		column-gap: 1rem;
		font-size: 1rem;
	}

	.apply-toggle {
		display: flex;
		align-items: center;
		column-gap: 1rem;
		cursor: pointer;
	}

</style>