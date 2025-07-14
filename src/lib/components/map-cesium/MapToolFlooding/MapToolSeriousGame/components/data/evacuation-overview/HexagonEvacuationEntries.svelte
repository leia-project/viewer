<script lang="ts">
	import type { Evacuation } from "../../module/game-elements/evacuation";

	export let evacuation: Evacuation;


</script>


<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<li class="evacuation-entry" on:click={() => evacuation.display()}>
	<span>{evacuation.hexagon.hex}</span>: {evacuation.extractionPoint.id} {evacuation.numberOfPersons} (evacuation.progress% complete)
</li>


<style>

	.evacuation-entry {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0;
	}

</style>