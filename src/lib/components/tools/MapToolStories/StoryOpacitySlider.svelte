<script lang="ts">
	import type { Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Slider } from "carbon-components-svelte";
	import type { Layer } from "$lib/map-core/layer";

	export let layer: Layer;

	const opacity: Writable<number> = layer.opacity;
    opacity.set(100); // Set initial opacity to 100%

	$: labelText = layer.title + ` ${$_("tools.layerManager.opacity")}: ` + $opacity + "%";

</script>

<Slider
	hideTextInput
	{labelText}
	min={0}
	max={100}
	bind:value={$opacity}
/>