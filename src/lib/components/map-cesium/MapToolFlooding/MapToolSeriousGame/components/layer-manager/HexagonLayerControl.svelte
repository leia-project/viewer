<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Slider } from "carbon-components-svelte";
	import type { HexagonLayer } from "../../module/game-elements/hexagons/hexagon-layer";
	import BaseLayer from "./BaseLayer.svelte";
	import ViewModeSwitch from "./ViewModeSwitch.svelte";

	export let layer: HexagonLayer;

	const visible = layer?.visible;
	const use2DMode = layer?.use2DMode;
	const opacity = layer.alpha;

</script>


<div class="hexagon-layer-control">
	<div class="hexagon-layer-header">
		<BaseLayer
			visible={visible}
			title={layer.title}
		/>
		{#if $visible}
			<div class="toggle-container">
				<span class="toggle-label">{$use2DMode ? "2D" : "3D"}</span>
				<ViewModeSwitch mode2D={use2DMode} />
			</div>
		{/if}
	</div>
	<div class="slider-container">
		<div class="slider-label">{$_("game.opacity")}</div>
		<Slider
			slot="Slider"
			bind:value={$opacity}
			min={0}
			max={1}
			step={0.01}
			hideLabel={true}
			hideTextInput={true}
		/>
	</div>
</div>

<style>

	.hexagon-layer-header {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 1rem;
	}
	
	.toggle-container {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
	}
	
	.hexagon-layer-control :global(.bx--slider__thumb) {
		background: var(--game-color-highlight);
		border-radius: 50%;
		border-top: solid 0.44rem transparent; 
		border-bottom: solid 0.44rem transparent;
	}
	.hexagon-layer-control :global(.bx--slider__track) {
		background: var(--game-color-highlight);
	}
	.hexagon-layer-control :global(.bx--slider__filled-track) {
		background: var(--game-color-highlight);
	}
	.hexagon-layer-control :global(.bx--slider__range-label) {
		color: #fff;
		font-size: 0.7rem;
		margin-right: 0;
	}

	.slider-container {
		display: grid;
		grid-template-columns: 160px 1fr auto;
		align-items: center;
		margin-top: 0.25rem;
		max-width: 400px;
	}

	.slider-label {
		text-align: right;
		margin-right: 1rem;
		font-weight: 600;
	}

</style>