<script lang="ts">
	import { getContext } from "svelte";
	import { Accordion } from "carbon-components-svelte";
	import { Slider } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController } from "./zonal-statistics-controller";
	import LayerControl from "../MapToolLayerManager/MapToolLayerControl.svelte";

	export let controller: ZonalStatisticsController;

	const { map } = getContext<any>("mapTools");
	const globeOpacity = map.options.globeOpacity;
	const resolvedDataLayers = controller.resolvedDataLayers;
</script>

<div class="panel">
	<div class="panel-header heading-01">{$_("tools.zonalStatistics.label")}</div>

	<div class="slider-wrapper">
		<Slider
			fullWidth
			hideTextInput
			labelText={$_("tools.backgroundControls.opacity") + " " + $globeOpacity + "%"}
			min={0}
			max={100}
			step={1}
			bind:value={$globeOpacity}
		/>
	</div>

	{#if $resolvedDataLayers.length === 0}
		<div class="empty body-compact-01">{$_("tools.zonalStatistics.noDataLayers")}</div>
	{:else}
		<Accordion class="layer-group-accordion">
			{#each $resolvedDataLayers as resolved (resolved.layerId)}
				<LayerControl layer={resolved.layer} />
			{/each}
		</Accordion>
	{/if}
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-05);
		box-sizing: border-box;
	}

	.panel-header {
		margin-bottom: var(--cds-spacing-02);
	}

	.slider-wrapper {
		width: 100%;
	}

	.slider-wrapper :global(.bx--slider) {
		min-width: 0;
		flex: 1 1 auto;
	}

	.slider-wrapper :global(.bx--slider-container) {
		width: 100%;
	}

	:global(.layer-group-accordion) {
		width: 100%;
	}

	.empty {
		color: var(--cds-text-secondary);
	}
</style>
