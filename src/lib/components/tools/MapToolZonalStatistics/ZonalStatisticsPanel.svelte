<script lang="ts">
	import { onDestroy } from "svelte";
	import { InlineNotification, InlineLoading, Tag } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController, ZonalSummary, SummaryRow } from "./zonal-statistics-controller";
	import { createZonalStyler, formatArea } from "./zonal-style";
	import ZonalLayerCard from "./ZonalLayerCard.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
	const loading = controller.loading;
	const settings = controller.settings;
	const columns = settings.columns;
	const styler = createZonalStyler(settings.valueStyles);

	let summary: ZonalSummary | undefined;

	// Recompute the summary whenever the selection changes (selections are few, areas are cached).
	const unsubscribe = controller.selectedZones.subscribe(() => {
		summary = settings.showSummary ? controller.buildSummary() : undefined;
	});

	onDestroy(unsubscribe);

	$: hasSelection = (summary?.zoneCount ?? 0) > 0;

	function summaryRowFor(layerId: string): SummaryRow | undefined {
		return summary?.rows.find((row) => row.layerId === layerId);
	}
</script>

<div class="panel">
	<InlineNotification
		class="instructions"
		kind="info"
		lowContrast
		title=""
		subtitle={$_("tools.zonalStatistics.instructions")}
	/>

	{#if $resolvedDataLayers.length === 0}
		{#if $loading && settings.layers.length > 0}
			<InlineLoading description={$_("tools.zonalStatistics.loadingLayers")} />
		{:else}
			<div class="empty body-compact-01">{$_("tools.zonalStatistics.noDataLayers")}</div>
		{/if}
	{:else}
		{#if settings.showSummary && hasSelection && summary}
			<div class="overview">
				<span class="heading-01 overview-title">{$_("tools.zonalStatistics.statistics")}</span>
				<Tag type="gray" size="sm">
					{$_("tools.zonalStatistics.summaryTotalArea", {
						values: { area: formatArea(summary.totalAreaSqMeters), count: summary.zoneCount }
					})}
				</Tag>
			</div>
		{/if}

		<div class="cards">
			{#each $resolvedDataLayers as resolved (resolved.layerId)}
				<ZonalLayerCard
					layer={resolved.layer}
					{columns}
					{styler}
					summaryRow={settings.showSummary && summary ? summaryRowFor(resolved.layerId) : undefined}
					hasSelection={settings.showSummary && hasSelection}
				/>
			{/each}
		</div>
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

	:global(.instructions.bx--inline-notification) {
		max-width: 100%;
		margin-top: 0;
		margin-bottom: 0;
	}

	.empty {
		color: var(--cds-text-secondary);
	}

	.overview {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--cds-spacing-02);
	}

	.overview-title {
		color: var(--cds-text-primary);
	}

	.overview :global(.bx--tag) {
		margin: 0;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}
</style>

