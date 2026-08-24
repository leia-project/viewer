<script lang="ts">
	import {
		Button,
		InlineNotification,
		SkeletonPlaceholder,
		SkeletonText
	} from "carbon-components-svelte";
	import { View, ViewOff } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import type { ZonalStatisticsController } from "./zonal-statistics-controller";
	import ZonalLayerCard from "./ZonalLayerCard.svelte";

	export let controller: ZonalStatisticsController;

	const resolvedDataLayers = controller.resolvedDataLayers;
	const visibleDataLayers = controller.visibleDataLayers;
	const loading = controller.loading;
	const settings = controller.settings;

	$: allVisible =
		$resolvedDataLayers.length > 0 && $visibleDataLayers.length === $resolvedDataLayers.length;
	// One placeholder card per configured layer that has not resolved yet.
	$: pendingCount = $loading ? Math.max(0, settings.layers.length - $resolvedDataLayers.length) : 0;

	function toggleAllLayers(): void {
		const next = !allVisible;
		for (const resolved of $resolvedDataLayers) resolved.layer.visible.set(next);
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

	{#if $resolvedDataLayers.length === 0 && pendingCount === 0}
		<div class="empty body-compact-01">{$_("tools.zonalStatistics.noDataLayers")}</div>
	{:else}
		<div class="toolbar">
			<Button
				size="small"
				kind="ghost"
				icon={allVisible ? ViewOff : View}
				disabled={$resolvedDataLayers.length === 0}
				on:click={toggleAllLayers}
			>
				{allVisible
					? $_("tools.zonalStatistics.allLayersOff")
					: $_("tools.zonalStatistics.allLayersOn")}
			</Button>
		</div>

		<div
			class="cards"
			aria-busy={pendingCount > 0}
			aria-label={pendingCount > 0 ? $_("tools.zonalStatistics.loadingLayers") : undefined}
		>
			{#each $resolvedDataLayers as resolved (resolved.layerId)}
				<ZonalLayerCard layer={resolved.layer} />
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

	.toolbar {
		display: flex;
		justify-content: flex-end;
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

