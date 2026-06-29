<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Layer } from "$lib/map-core/layer";
	import { Checkbox } from "carbon-components-svelte";

	export let layer: Layer;

	$: visible = layer.visible;
</script>


<li class="project-layer">
	<Checkbox
		title={$visible ? $_("general.off") : $_("general.on")}
		checked={$visible}
		on:change={() => layer.visible.set(!$visible)}
	/>
	<div class="label-01 layer-title" title={layer.title}>{layer.title}</div>
</li>


<style>

	.project-layer {
		display: grid;
		grid-template-columns: 32px 1fr;
		align-items: center;
	}

	.layer-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
</style>