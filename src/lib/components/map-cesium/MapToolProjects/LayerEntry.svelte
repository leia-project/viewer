<script lang="ts">
	import type { Layer } from "$lib/components/map-core/layer";
	import { Checkbox } from "carbon-components-svelte";

	
	export let layer: Layer;
	$: visible = layer.visible;

</script>


<li class="project-layer">
	<Checkbox
		checked={$visible}
		on:change={() => layer.visible.set(!$visible)}
	/>
	{layer.title}
</li>


<style>

	.project-layer {
		display: grid;
		grid-template-columns: 32px 1fr;
		align-items: center;
	}
	
</style>