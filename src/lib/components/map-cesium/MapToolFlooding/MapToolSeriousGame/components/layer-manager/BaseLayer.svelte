<script lang="ts">
	import { onMount } from "svelte";
	import type { Unsubscriber, Writable } from "svelte/store";
	import { Checkbox } from "carbon-components-svelte";
	import type { Map } from "../../external-dependencies";
	
	export let visible: Writable<boolean>;
	export let title: string; 
	export let map: Map | undefined = undefined;

	onMount(() => {
		let unsubscribe: Unsubscriber | undefined = undefined;
		if (title === "DTB 3D") {
			unsubscribe = visible.subscribe((v) => {
				if (map) {
					map.viewer.scene.globe.translucency.enabled = v;
					map.options.globeOpacity.set(v ? 35 : 100);
				}
			})
		}
		return () => unsubscribe?.();
	});
	
</script>


<div class="layer-toggle">
	<Checkbox
		bind:checked={$visible}
		labelText={title}
	/>
</div>
<slot name="Slider"/>
<slot name="2DMode"/>


<style>

	:global(.layer-toggle .bx--checkbox-label::before) {
		border-color: var(--game-color-highlight);
	}

	:global(.layer-toggle .bx--checkbox:checked+.bx--checkbox-label::before) {
		background-color: var(--game-color-highlight);
	}

	:global(.layer-toggle .bx--checkbox-label::after) {
		border-bottom-color: rgb(var(--game-color-bg));
		border-left-color: rgb(var(--game-color-bg));
	}

	:global(.layer-toggle .bx--checkbox-label-text) {
		padding-left: 0.5rem;
	}

</style>