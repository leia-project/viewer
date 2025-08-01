<script lang="ts">
	import { Checkbox } from "carbon-components-svelte";
	import type { Game } from "../../../module/game";
	import MeasureEntry from "./MeasureEntry.svelte";

	export let game: Game;

	const measures = game.evacuationController.roadNetwork.measures;
	const measureToggled = game.evacuationController.roadNetwork.measureToggled;
	
</script>

<div class="layer-control">
	<Checkbox
		bind:checked={$measureToggled}
		labelText="Measures"
	/>
</div>

<div class="measure-list">
	{#each measures as measure}
		<MeasureEntry {measure} />
	{/each}
</div>