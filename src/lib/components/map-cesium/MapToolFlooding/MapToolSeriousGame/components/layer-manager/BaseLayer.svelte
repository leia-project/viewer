<script lang="ts">
	import { Checkbox } from "carbon-components-svelte";
	import type { Writable } from "svelte/store";
	
	export let visible: Writable<boolean>;
	export let title: string;
	
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