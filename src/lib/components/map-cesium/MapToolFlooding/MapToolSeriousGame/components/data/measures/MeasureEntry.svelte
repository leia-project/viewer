<script lang="ts">
	import { Checkbox } from "carbon-components-svelte";
	import type { Measure } from "../../../module/game-elements/roads/measure";

	export let measure: Measure;

	const applied = measure.applied;

</script>


<div class="measure-entry">
	<Checkbox
		bind:checked={$applied}
		labelText={measure.config.name}
	/>
	<div>{measure.config.type}</div>
</div>


<style>
	.measure-entry {
		display: flex;
		align-items: center;
		column-gap: 1rem;
	}
</style>