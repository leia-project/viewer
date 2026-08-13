<script lang="ts">
	import { onDestroy } from "svelte";
	import { Accordion, InlineNotification } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController, ZonalSummary } from "./zonal-statistics-controller";
	import { createZonalStyler, formatArea, formatNumber } from "./zonal-style";
	import LayerControl from "../MapToolLayerManager/MapToolLayerControl.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
	const settings = controller.settings;
	const columns = settings.columns;
	const styler = createZonalStyler(settings.valueStyles);

	function columnLabel(index: number): string {
		const column = columns[index];
		return column?.label ?? column?.attribute ?? "";
	}

	let summary: ZonalSummary | undefined;

	// Recompute the summary whenever the selection changes (selections are few, areas are cached).
	const unsubscribe = controller.selectedZones.subscribe(() => {
		summary = settings.showSummary ? controller.buildSummary() : undefined;
	});

	onDestroy(unsubscribe);
</script>

<div class="panel">
	<InlineNotification
		class="instructions"
		kind="info"
		lowContrast
		hideCloseButton
		title=""
		subtitle={$_("tools.zonalStatistics.instructions")}
	/>

	{#if $resolvedDataLayers.length === 0}
		<div class="empty body-compact-01">{$_("tools.zonalStatistics.noDataLayers")}</div>
	{:else}
		<Accordion class="layer-group-accordion">
			{#each $resolvedDataLayers as resolved (resolved.layerId)}
				<LayerControl layer={resolved.layer} />
			{/each}
		</Accordion>
	{/if}

	{#if settings.showSummary && summary && summary.zoneCount > 0}
		<div class="summary">
			<div class="summary-head">
				<span class="heading-01 summary-title">{$_("tools.zonalStatistics.statistics")}</span>
				<span class="summary-total body-compact-01">
					{$_("tools.zonalStatistics.summaryTotalArea", {
						values: { area: formatArea(summary.totalAreaSqMeters), count: summary.zoneCount }
					})}
				</span>
			</div>
			{#each summary.rows as row (row.layerId)}
				<div class="summary-card">
					<div class="summary-card-head">
						<span class="summary-card-title">{row.title}</span>
					</div>
					<div class="summary-card-body">
						{#each row.columns as col (col.columnIndex)}
							<div class="metric">
								<span class="metric-label label-01">{columnLabel(col.columnIndex)}</span>
								{#if col.styled}
									{#if col.categories && col.categories.length > 0}
										<div class="summary-chips">
											{#each col.categories as category (category.value)}
												<span
													class="summary-chip"
													style={styler.cellStyle(category.value, true)}
												>
													<span class="summary-chip-value">{category.value}</span>
													<span class="summary-chip-area"
														>{formatArea(category.areaSqMeters)}</span
													>
												</span>
											{/each}
										</div>
									{:else}
										<span class="summary-empty">–</span>
									{/if}
								{:else if col.numeric}
									<div class="numeric">
										<div class="numeric-hero">
											<span class="numeric-mean">{formatNumber(col.numeric.mean)}</span>
											<span class="numeric-mean-label"
												>{$_("tools.zonalStatistics.statMean")}</span
											>
										</div>
										<div
											class="numeric-gauge"
											style="--pos: {col.numeric.max > col.numeric.min
												? ((col.numeric.mean - col.numeric.min) /
														(col.numeric.max - col.numeric.min)) *
													100
												: 50}%"
										>
											<span class="numeric-track"></span>
											<span class="numeric-marker"></span>
										</div>
										<div class="numeric-ends">
											<div class="numeric-end">
												<span class="numeric-end-label"
													>{$_("tools.zonalStatistics.statMin")}</span
												>
												<span class="numeric-end-value"
													>{formatNumber(col.numeric.min)}</span
												>
											</div>
											<div class="numeric-end numeric-end-max">
												<span class="numeric-end-label"
													>{$_("tools.zonalStatistics.statMax")}</span
												>
												<span class="numeric-end-value"
													>{formatNumber(col.numeric.max)}</span
												>
											</div>
										</div>
									</div>
								{:else}
									<span class="summary-empty">–</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
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
		margin-bottom: var(--cds-spacing-03);
	}

	:global(.layer-group-accordion) {
		width: 100%;
	}

	.empty {
		color: var(--cds-text-secondary);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
		padding-top: var(--cds-spacing-05);
		border-top: 1px solid var(--cds-ui-03);
	}

	.summary-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--cds-spacing-02);
	}

	.summary-title {
		color: var(--cds-text-primary);
	}

	.summary-total {
		color: var(--cds-text-secondary);
		background-color: var(--cds-ui-01);
		border: 1px solid var(--cds-ui-03);
		border-radius: 999px;
		padding: var(--cds-spacing-01) var(--cds-spacing-03);
		white-space: nowrap;
	}

	.summary-card {
		display: flex;
		flex-direction: column;
		background-color: var(--cds-ui-01);
		border: 1px solid var(--cds-ui-03);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.summary-card-head {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
		background-color: var(--cds-ui-03);
	}

	.summary-card-title {
		color: var(--cds-text-primary);
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.2;
	}

	.summary-card-body {
		display: flex;
		flex-direction: column;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-04);
	}

	.metric + .metric {
		border-top: 1px solid var(--cds-ui-03);
	}

	.metric-label {
		color: var(--cds-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 600;
	}

	.summary-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cds-spacing-02);
	}

	.summary-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		height: 1.5rem;
		padding: 0 var(--cds-spacing-03);
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.summary-chip-value {
		font-weight: 700;
	}

	.summary-chip-area {
		font-weight: 500;
		opacity: 0.85;
		white-space: nowrap;
	}

	.numeric {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.numeric-hero {
		display: flex;
		align-items: baseline;
		gap: var(--cds-spacing-02);
	}

	.numeric-mean {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1;
		color: var(--cds-text-primary);
		font-variant-numeric: tabular-nums;
		word-break: break-word;
		min-width: 0;
	}

	.numeric-mean-label {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 600;
		color: var(--cds-link-01);
	}

	.numeric-gauge {
		position: relative;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--cds-link-01) 22%, transparent),
			var(--cds-link-01)
		);
	}

	.numeric-marker {
		position: absolute;
		top: 50%;
		left: var(--pos);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: var(--cds-link-01);
		transform: translate(-50%, -50%);
		box-shadow:
			0 0 0 3px var(--cds-ui-01),
			0 1px 2px rgba(0, 0, 0, 0.25);
	}

	.numeric-ends {
		display: flex;
		justify-content: space-between;
		gap: var(--cds-spacing-04);
	}

	.numeric-end {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.numeric-end-max {
		align-items: flex-end;
		text-align: right;
	}

	.numeric-end-label {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--cds-text-secondary);
	}

	.numeric-end-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cds-text-primary);
		font-variant-numeric: tabular-nums;
		word-break: break-word;
	}

	.summary-empty {
		color: var(--cds-text-secondary);
	}
</style>

