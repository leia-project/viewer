<script lang="ts">
	import { get, type Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Slider } from "carbon-components-svelte";
	import type { Layer } from "$lib/map-core/layer";

	export let layer: Layer;
	export let linkedLayers: Array<Layer> = [];
	export let label: string | undefined = undefined;

	const opacity: Writable<number> = {
		subscribe: layer.opacity.subscribe,
		set: setOpacity,
		update: (updater) => setOpacity(updater(get(layer.opacity)))
	};

	function setOpacity(value: number): void {
		for (const target of [layer, ...linkedLayers]) {
			if (get(target.opacity) !== value) target.opacity.set(value);
		}
	}

	$: labelText = (label ?? layer.title) + ` ${$_("tools.layerManager.opacity")}: ` + $opacity + "%";

</script>

<div class="story-opacity-slider">
	<Slider
		hideTextInput
		fullWidth
		{labelText}
		min={0}
		max={100}
		bind:value={$opacity}
	/>
</div>

<style>
	.story-opacity-slider {
		padding: 0.5rem 0;
	}

	.story-opacity-slider :global(.bx--slider) {
		min-width: 0;
		flex: 1 1 auto;
	}

	.story-opacity-slider :global(.bx--label) {
		overflow-wrap: anywhere;
	}
</style>