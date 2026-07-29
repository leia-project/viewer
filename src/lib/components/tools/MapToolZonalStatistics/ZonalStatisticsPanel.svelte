<script lang="ts">
	import { Accordion } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController } from "./zonal-statistics-controller";
	import LayerControl from "../MapToolLayerManager/MapToolLayerControl.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
</script>

<div class="panel">
	<div class="panel-header heading-01">{$_("tools.zonalStatistics.label")}</div>

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

	:global(.layer-group-accordion) {
		width: 100%;
	}

	.empty {
		color: var(--cds-text-secondary);
	}
</style>
