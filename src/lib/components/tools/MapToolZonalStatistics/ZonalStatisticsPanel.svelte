<script lang="ts">
	import { InlineNotification, SkeletonPlaceholder, SkeletonText } from "carbon-components-svelte";
	import { Add, TrashCan } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController } from "./zonal-statistics-controller";
	import ZonalLayerCard from "./ZonalLayerCard.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
	const tableLayers = controller.tableLayers;
	const loading = controller.loading;
	const settings = controller.settings;

	// One placeholder card per configured layer that has not resolved yet.
	$: pendingCount = $loading ? Math.max(0, settings.layers.length - $resolvedDataLayers.length) : 0;
	$: allInTable =
		$resolvedDataLayers.length > 0 && $tableLayers.length === $resolvedDataLayers.length;
</script>

<div class="panel">
	<InlineNotification
		class="instructions"
		kind="info"
		lowContrast
		title=""
		subtitle={$_("tools.zonalStatistics.instructions")}
	/>

	{#if $resolvedDataLayers.length === 0 && pendingCount === 0}
		<div class="empty body-compact-01">{$_("tools.zonalStatistics.noDataLayers")}</div>
	{:else}
		<div class="table-header">
			<span class="table-title">{$_("tools.zonalStatistics.tableSection")}</span>
			<span class="table-count">{$tableLayers.length} / {$resolvedDataLayers.length}</span>
			<div class="table-header-actions">
				<button
					class="icon-btn primary"
					type="button"
					disabled={allInTable}
					on:click={() => controller.addAllTableLayers()}
					aria-label={$_("tools.zonalStatistics.addAllToTable")}
					title={$_("tools.zonalStatistics.addAllToTable")}
				>
					<Add size={16} />
				</button>
				<button
					class="icon-btn danger"
					type="button"
					disabled={$tableLayers.length === 0}
					on:click={() => controller.clearTableLayers()}
					aria-label={$_("tools.zonalStatistics.removeAllFromTable")}
					title={$_("tools.zonalStatistics.removeAllFromTable")}
				>
					<TrashCan size={16} />
				</button>
			</div>
		</div>
		<div
			class="cards"
			aria-busy={pendingCount > 0}
			aria-label={pendingCount > 0 ? $_("tools.zonalStatistics.loadingLayers") : undefined}
		>
			{#each $resolvedDataLayers as resolved (resolved.layerId)}
				<ZonalLayerCard {controller} layer={resolved.layer} layerId={resolved.layerId} />
			{/each}
			{#each Array.from({ length: pendingCount }, (_, i) => i) as index (index)}
				<div class="card-skeleton">
					<div class="card-box">
						<div class="card-head">
							<SkeletonPlaceholder class="radio-skeleton" />
							<SkeletonText class="title-skeleton" width="70%" />
						</div>
					</div>
					<div class="action-slot">
						<SkeletonPlaceholder class="action-skeleton" />
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
		margin-bottom: 0;
	}

	.empty {
		color: var(--cds-text-secondary);
	}

	.table-header {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		min-height: 1.5rem;
		min-width: 0;
	}

	.table-title {
		flex: 1;
		min-width: 0;
		font-size: 0.75rem;
		line-height: 1.33333;
		letter-spacing: 0.32px;
		color: var(--cds-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.table-count {
		flex: 0 0 auto;
		font-size: 0.75rem;
		line-height: 1.33333;
		color: var(--cds-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	/* No trailing padding: right-aligning lands the trash button in the same column as each card's
	   +/trash button, which sits outside the card box at the row's right edge. */
	.table-header-actions {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
	}

	/* Transparent at rest, filled on hover: the coloured fill is what sets the bulk actions apart
	   from the per-card +/trash buttons without adding permanent weight to the panel. */
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 2px;
		background-color: transparent;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.icon-btn.primary {
		color: var(--cds-interactive-01, #0f62fe);
	}

	.icon-btn.primary:hover:not(:disabled) {
		background-color: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
	}

	.icon-btn.danger {
		color: var(--cds-support-01, #da1e28);
	}

	.icon-btn.danger:hover:not(:disabled) {
		background-color: var(--cds-support-01, #da1e28);
		color: var(--cds-text-04, #ffffff);
	}

	.icon-btn:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: 1px;
	}

	.icon-btn:disabled {
		background-color: transparent;
		color: var(--cds-disabled-02, #c6c6c6);
		cursor: not-allowed;
	}

	@media (prefers-reduced-motion: reduce) {
		.icon-btn {
			transition: none;
		}
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}

	/* Mirrors ZonalLayerCard's row: bordered box with a 2.5rem head, plus the button slot outside it. */
	.card-skeleton {
		display: flex;
		align-items: flex-start;
		gap: var(--cds-spacing-02);
		min-width: 0;
	}

	.card-skeleton .card-box {
		flex: 1;
		min-width: 0;
		background-color: var(--cds-ui-02);
		border: 1px solid var(--cds-ui-03);
		border-radius: 2px;
		overflow: hidden;
	}

	.card-skeleton .card-head {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		min-height: 2.5rem;
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
		background-color: var(--cds-ui-01);
		min-width: 0;
	}

	.card-skeleton .action-slot {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 2.5rem;
	}

	/* Matches Carbon's radio circle. */
	.card-skeleton :global(.radio-skeleton) {
		width: 1.125rem;
		height: 1.125rem;
		min-width: 1.125rem;
		border-radius: 50%;
		flex: 0 0 auto;
	}

	.card-skeleton :global(.action-skeleton) {
		width: 1rem;
		height: 1rem;
		min-width: 1rem;
		flex: 0 0 auto;
	}

	/* Height of the label-01 title line the card renders. */
	.card-skeleton :global(.title-skeleton) {
		flex: 0 1 auto;
		min-width: 0;
		height: 1rem;
		margin: 0;
	}
</style>

