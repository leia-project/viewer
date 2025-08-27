<script lang="ts">
	import type { Writable } from "svelte/store";
	import { ChoroplethMap, WatsonHealth3DPrintMesh } from "carbon-icons-svelte";
		
	export let mode2D: Writable<boolean>;

</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div id="toggle-2d-3d" on:click={() => mode2D.set(!$mode2D)}>
	<div class="toggle-highlight" style="left: {$mode2D ? '50%' : '0'}"></div>
	<div class="toggle-option" class:active={!$mode2D}>
		<WatsonHealth3DPrintMesh />
	</div>
	<div class="toggle-option" class:active={$mode2D}>
		<ChoroplethMap />
	</div>
</div>

<style>
	#toggle-2d-3d {
		--toggle-size: 40px;
		display: inline-flex;
		background-color: rgb(var(--game-color-bg));
		color: var(--game-color-highlight);
		border-radius: var(--toggle-size);
		position: relative;
		cursor: pointer;
		border: 1px solid var(--game-color-highlight);
		height: calc(var(--toggle-size) + 2px);
	}
	.toggle-option {
		width: var(--toggle-size);
		height: var(--toggle-size);
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		
	}
	.toggle-highlight {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--toggle-size);
		height: var(--toggle-size);
		background-color: var(--game-color-highlight);
		border-radius: var(--toggle-size);
		transition: 0.3s;    
	}
	
	:global(#toggle-2d-3d .active svg path) {
		fill: rgb(var(--game-color-bg)) !important;
		transition: 0.3s;
	}
	
</style>
