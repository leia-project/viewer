<script lang="ts">
	import {
		InlineNotification,
		SkeletonPlaceholder,
		SkeletonText
	} from "carbon-components-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController } from "./zonal-statistics-controller";
	import ZonalLayerCard from "./ZonalLayerCard.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
	const loading = controller.loading;
	const settings = controller.settings;

	// One placeholder card per configured layer that has not resolved yet.
	$: pendingCount = $loading ? Math.max(0, settings.layers.length - $resolvedDataLayers.length) : 0;
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
					<SkeletonPlaceholder class="toggle-skeleton" />
					<SkeletonText class="title-skeleton" width="70%" />
					<SkeletonPlaceholder class="action-skeleton" />
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

	.cards {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}

	.card-skeleton {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		padding: var(--cds-spacing-03);
		background-color: var(--cds-ui-01);
		border: 1px solid var(--cds-ui-03);
		border-radius: 2px;
	}

	.card-skeleton :global(.toggle-skeleton),
	.card-skeleton :global(.action-skeleton) {
		width: 1rem;
		height: 1rem;
		min-width: 1rem;
		flex: 0 0 auto;
	}

	.card-skeleton :global(.title-skeleton) {
		flex: 1 1 auto;
		margin: 0;
	}
</style>

