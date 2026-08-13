<script lang="ts">
	import { Checkbox, Slider, Tag } from "carbon-components-svelte";
	import { Information, ChevronDown } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import type { Layer } from "$lib/map-core/layer";
	import type { SummaryRow } from "./zonal-statistics-controller";
	import type { ZonalColumn } from "./zonal-config";
	import type { ZonalStyler } from "./zonal-style";
	import { formatArea, formatNumber } from "./zonal-style";
	import ExpandableDescription from "$lib/components/theme/ExpandableDescription/ExpandableDescription.svelte";
	import ErrorMessage from "$lib/components/theme/ErrorMessage/ErrorMessage.svelte";

	export let layer: Layer;
	export let columns: Array<ZonalColumn>;
	export let styler: ZonalStyler;
	export let summaryRow: SummaryRow | undefined = undefined;
	export let hasSelection: boolean = false;

	const visible = layer.visible;
	const opacity = layer.opacity;
	const customControls = layer.customControls;

	const legendUrl = layer.config.legendSupported ? layer.config.legendUrl : undefined;
	const metadataUrl = layer.config.metadataLink || layer.config.metadataUrl || undefined;
	const description = layer.config.descriptionSupported ? layer.config.description : undefined;
	// Custom controls (e.g. the GeoJSON style switcher + legend) populate after the layer loads.
	$: hasSettings = Boolean(
		legendUrl || description || layer.config.opacitySupported || ($customControls?.length ?? 0) > 0
	);

	let settingsOpen = false;
	let legendValid = true;

	function columnLabel(index: number): string {
		const column = columns[index];
		return column?.label ?? column?.attribute ?? "";
	}
</script>

<div class="layer-card" class:is-hidden={!$visible}>
	<div class="card-head">
		<div class="head-toggle">
			<Checkbox
				title={$visible ? $_("general.off") : $_("general.on")}
				bind:checked={$visible}
			/>
		</div>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<button
			class="title-btn"
			type="button"
			on:click={() => ($visible = !$visible)}
			title={layer.title}
		>
			<span class="layer-title label-01">{layer.title}</span>
		</button>
		<div class="head-actions">
			{#if metadataUrl}
				<a
					href={metadataUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="icon-btn"
					title={$_("tools.layerManager.openMetadata")}
					aria-label={$_("tools.layerManager.openMetadata")}
				>
					<Information size={16} />
				</a>
			{/if}
			{#if hasSettings}
				<button
					class="icon-btn expand-btn"
					class:open={settingsOpen}
					type="button"
					on:click={() => (settingsOpen = !settingsOpen)}
					aria-expanded={settingsOpen}
					aria-label={$_("tools.layerManager.styling")}
					title={$_("tools.layerManager.styling")}
				>
					<ChevronDown size={16} />
				</button>
			{/if}
		</div>
	</div>

	{#if settingsOpen && hasSettings}
		<div class="card-settings">
			{#if description}
				<ExpandableDescription text={description} />
			{/if}
			{#if $customControls}
				{#each $customControls as control}
					<svelte:component this={control.component} {...control.props} />
				{/each}
			{/if}
			{#if layer.config.opacitySupported}
				<div class="slider-wrapper">
					<Slider
						hideTextInput
						labelText={`${$_("tools.layerManager.opacity")} ` + $opacity + "%"}
						min={0}
						max={100}
						bind:value={$opacity}
					/>
				</div>
			{/if}
			{#if legendUrl}
				<div class="legend-block">
					<span class="block-label label-01">{$_("tools.layerManager.legend")}</span>
					{#if legendValid}
						<img
							class="legend"
							src={legendUrl}
							alt={$_("tools.layerManager.legend")}
							on:error={() => (legendValid = false)}
						/>
					{:else}
						<ErrorMessage message={$_("tools.layerManager.legendNotFoundText")} />
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<div class="card-stats">
		{#if hasSelection && summaryRow}
			{#each summaryRow.columns as col (col.columnIndex)}
				<div class="metric">
					<span class="metric-label label-01">{columnLabel(col.columnIndex)}</span>
					{#if col.styled}
						{#if col.categories && col.categories.length > 0}
							<div class="chips">
								{#each col.categories as category (category.value)}
									<Tag size="sm" style={styler.cellStyle(category.value, true)}>
										<span class="chip-value">{category.value}</span>
										<span class="chip-area">{formatArea(category.areaSqMeters)}</span>
									</Tag>
								{/each}
							</div>
						{:else}
							<span class="stat-empty">–</span>
						{/if}
					{:else if col.numeric}
						<div class="numeric">
							<div class="stat">
								<span class="stat-label label-01">{$_("tools.zonalStatistics.statMin")}</span>
								<span class="stat-value">{formatNumber(col.numeric.min)}</span>
							</div>
							<div class="stat">
								<span class="stat-label label-01">{$_("tools.zonalStatistics.statMean")}</span>
								<span class="stat-value stat-value-strong">{formatNumber(col.numeric.mean)}</span>
							</div>
							<div class="stat">
								<span class="stat-label label-01">{$_("tools.zonalStatistics.statMax")}</span>
								<span class="stat-value">{formatNumber(col.numeric.max)}</span>
							</div>
						</div>
					{:else}
						<span class="stat-empty">–</span>
					{/if}
				</div>
			{/each}
		{:else}
			<p class="stats-hint body-compact-01">{$_("tools.zonalStatistics.noSelection")}</p>
		{/if}
	</div>
</div>

<style>
	.layer-card {
		display: flex;
		flex-direction: column;
		background-color: var(--cds-ui-02);
		border: 1px solid var(--cds-ui-03);
		border-radius: 2px;
		overflow: hidden;
		transition: opacity 0.15s ease;
	}

	.layer-card.is-hidden {
		opacity: 0.6;
	}

	.card-head {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
		background-color: var(--cds-ui-01);
		border-bottom: 1px solid var(--cds-ui-03);
		min-width: 0;
	}

	.head-toggle {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.head-toggle :global(.bx--checkbox-label) {
		padding-left: 1rem;
	}

	.title-btn {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		flex: 1;
		min-width: 0;
		background: none;
		border: none;
		padding: var(--cds-spacing-01) 0;
		margin: 0;
		cursor: pointer;
		text-align: left;
		color: var(--cds-text-primary);
	}

	.layer-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		background: none;
		color: var(--cds-icon-primary, #161616);
		cursor: pointer;
		transition: color 0.15s ease, background-color 0.15s ease, transform 0.2s ease;
		outline: none;
		text-decoration: none;
	}

	.icon-btn:hover,
	.icon-btn:focus-visible {
		color: var(--cds-link-primary, #0f62fe);
		background-color: var(--cds-hover-ui, #e5e5e5);
	}

	.expand-btn.open {
		transform: rotate(180deg);
	}

	.card-settings {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-04);
		border-bottom: 1px solid var(--cds-ui-03);
	}

	.card-settings :global(.geojson-styling-options) {
		margin-top: 0;
	}

	.card-settings :global(.geojson-styling-options > .control-section:first-child) {
		margin-top: 0;
	}

	.slider-wrapper {
		width: calc(100% - var(--cds-spacing-01));
	}

	.slider-wrapper :global(.bx--slider-container) {
		width: 100%;
	}

	.slider-wrapper :global(.bx--slider) {
		min-width: 0;
		flex: 1 1 auto;
	}

	.legend-block {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
	}

	.block-label {
		color: var(--cds-text-secondary);
	}

	.legend {
		max-width: 100%;
		background-color: var(--cds-ui-03);
	}

	.card-stats {
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
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cds-spacing-02);
	}

	.chips :global(.bx--tag) {
		margin: 0;
		font-weight: 600;
	}

	.chips :global(.bx--tag__label) {
		display: inline-flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		color: inherit;
	}

	.chip-area {
		font-weight: 400;
		opacity: 0.85;
		white-space: nowrap;
	}

	.numeric {
		display: flex;
		gap: var(--cds-spacing-05);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.stat-label {
		color: var(--cds-text-secondary);
	}

	.stat-value {
		font-size: 0.875rem;
		color: var(--cds-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.stat-value-strong {
		font-weight: 600;
	}

	.stat-empty {
		color: var(--cds-text-secondary);
	}

	.stats-hint {
		color: var(--cds-text-secondary);
		padding: var(--cds-spacing-04);
		margin: 0;
	}
</style>
