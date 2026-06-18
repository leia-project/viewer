<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Slider } from "carbon-components-svelte";
	import { get, type Writable } from "svelte/store";
	import type { Layer } from "$lib/components/map-core/layer";


	export let layer: Layer;

	const opacity: Writable<number> = layer.opacity;
    opacity.set(100); // Set initial opacity to 100%

	$: labelText = layer.title + ` ${$_("tools.layerManager.opacity")}: ` + $opacity + "%";

</script>

<Slider hideTextInput {labelText} min={0} max={100} bind:value={$opacity} />