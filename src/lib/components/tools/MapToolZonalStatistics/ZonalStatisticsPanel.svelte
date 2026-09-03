<script lang="ts">
	import {
		InlineNotification,
		SkeletonPlaceholder,
		SkeletonText,
		Tag
	} from "carbon-components-svelte";
	import { Add, ChevronRight, TrashCan } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import type { GroupedDataLayers, ZonalStatisticsController } from "./zonal-statistics-controller";
	import ZonalLayerCard from "./ZonalLayerCard.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
	const groupedDataLayers = controller.groupedDataLayers;
	const tableLayers = controller.tableLayers;
	const selectedLayerId = controller.selectedLayerId;
	const loading = controller.loading;
	const settings = controller.settings;
	const instructionsDismissed = controller.instructionsDismissed;

	let collapsedGroupIds = new Set<string>();
	let renderGroups: Array<
		GroupedDataLayers & {
			expanded: boolean;
			panelId?: string;
			inTableCount: number;
			hasSelectedChild: boolean;
		}
	> = [];

	// One placeholder card per configured layer that has not resolved yet.
	$: pendingCount = $loading ? Math.max(0, settings.layers.length - $resolvedDataLayers.length) : 0;
	$: allInTable =
		$resolvedDataLayers.length > 0 && $tableLayers.length === $resolvedDataLayers.length;
	$: tableLayerIds = new Set($tableLayers.map((layer) => layer.layerId));
	$: renderGroups = $groupedDataLayers.map((group) => {
		const groupId = group.groupId;
		const expanded = groupId ? !collapsedGroupIds.has(groupId) : true;
		const hasSelectedChild = group.layers.some((layer) => layer.layerId === $selectedLayerId);
		const inTableCount = group.layers.reduce(
			(count, layer) => (tableLayerIds.has(layer.layerId) ? count + 1 : count),
			0
		);
		return {
			...group,
			expanded,
			panelId: groupId ? groupPanelId(groupId) : undefined,
			inTableCount,
			hasSelectedChild
		};
	});

	function toggleGroup(groupId: string | undefined): void {
		if (!groupId) return;
		const next = new Set(collapsedGroupIds);
		if (next.has(groupId)) next.delete(groupId);
		else next.add(groupId);
		collapsedGroupIds = next;
	}

	function groupPanelId(groupId: string): string {
		return `zonal-group-${groupId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
	}
</script>

<div class="panel">
	{#if !$instructionsDismissed}
		<InlineNotification
			class="instructions"
			kind="info"
			lowContrast
			title=""
			subtitle={$_("tools.zonalStatistics.instructions")}
			on:close={() => instructionsDismissed.set(true)}
		/>
	{/if}

	{#if $resolvedDataLayers.length === 0 && pendingCount === 0}
		<div class="empty body-compact-01">{$_("tools.zonalStatistics.noDataLayers")}</div>
	{:else}
		<div class="table-header">
			<span class="table-title bx--label">{$_("tools.zonalStatistics.tableSection")}</span>
			<span class="table-count">
				<Tag size="sm">{$tableLayers.length}/{$resolvedDataLayers.length}</Tag>
			</span>
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
			{#each renderGroups as group (group.groupId ?? "ungrouped")}
				{#if group.groupId}
					<section class="group-section">
						<button
							class="group-toggle"
							class:is-selected={group.hasSelectedChild}
							type="button"
							aria-expanded={group.expanded}
							aria-controls={group.panelId}
							on:click={() => toggleGroup(group.groupId)}
						>
							<span class="group-chevron" class:chevron-rotated={group.expanded}>
								<ChevronRight size={16} />
							</span>
							<span class="group-title">{group.title}</span>
							<span class="group-count">
								<Tag size="sm">{group.inTableCount}/{group.layers.length}</Tag>
							</span>
						</button>
						{#if group.expanded}
							<div class="group-cards" id={group.panelId}>
								{#each group.layers as resolved (resolved.layerId)}
									<ZonalLayerCard {controller} layer={resolved.layer} layerId={resolved.layerId} />
								{/each}
							</div>
						{/if}
					</section>
				{:else}
					{#each group.layers as resolved (resolved.layerId)}
						<ZonalLayerCard {controller} layer={resolved.layer} layerId={resolved.layerId} />
					{/each}
				{/if}
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
		color: var(--cds-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.table-count {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
	}

	.table-count :global(.bx--tag) {
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
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
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

		.group-chevron {
			transition: none;
		}
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}

	.group-section {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.group-toggle {
		display: flex;
		align-items: center;
		gap: 0;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--cds-text-primary);
		cursor: pointer;
		text-align: left;
	}

	.group-toggle:hover {
		background-color: var(--cds-ui-03);
	}

	.group-toggle:hover .group-chevron {
		color: var(--cds-link-primary, #0f62fe);
	}

	.group-toggle.is-selected .group-count :global(.bx--tag) {
		background-color: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
	}

	.group-chevron {
		width: 1.5rem;
		height: 1.5rem;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: inherit;
		transition:
			color 120ms ease,
			transform 70ms ease;
	}

	.group-chevron.chevron-rotated {
		transform: rotate(90deg);
		transform-origin: center center;
	}

	.group-title {
		flex: 1;
		min-width: 0;
		margin-left: var(--cds-spacing-02);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.group-count {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
	}

	.group-count :global(.bx--tag) {
		font-variant-numeric: tabular-nums;
	}

	.group-cards {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
		margin-left: var(--cds-spacing-05);
	}

	.group-toggle:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: 1px;
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
