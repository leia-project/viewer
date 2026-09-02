<script lang="ts">
	import { Loading, RadioButton, Slider } from "carbon-components-svelte";
	import { Add, ChevronDown, TrashCan } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import MetadataLink from "$lib/components/theme/MetadataLink/MetadataLink.svelte";
	import type { Layer } from "$lib/map-core/layer";
	import type { ZonalStatisticsController } from "./zonal-statistics-controller";

	export let controller: ZonalStatisticsController;
	export let layer: Layer;
	export let layerId: string;

	const opacity = layer.opacity;
	const selectedLayerId = controller.selectedLayerId;
	const tableLayers = controller.tableLayers;
	const loadingLayerIds = controller.loadingLayerIds;
	const hasSettings = layer.config.opacitySupported;
	const metadataUrl = layer.config.metadataLink || layer.config.metadataUrl;

	let expanded = false;

	$: selected = $selectedLayerId === layerId;
	$: inTable = $tableLayers.some((dl) => dl.layerId === layerId);
	$: busy = $loadingLayerIds.has(layerId);
</script>

<div class="layer-card" class:is-selected={selected}>
	<div class="card-box">
		<div class="card-head">
			<div class="head-label">
				<RadioButton
					name="zonal-layer"
					value={layerId}
					checked={selected}
					labelText={layer.title}
					title={layer.title}
					on:change={() => controller.selectLayer(layerId)}
				/>
			</div>
			<MetadataLink url={metadataUrl} />
			{#if busy}
				<div class="card-spinner">
					<Loading small withOverlay={false} description={$_("tools.zonalStatistics.loadingLayers")} />
				</div>
			{/if}
			{#if hasSettings}
				<button
					class="icon-btn expand-btn"
					class:open={expanded}
					type="button"
					on:click={() => (expanded = !expanded)}
					aria-expanded={expanded}
					aria-label={expanded ? $_("tools.menu.collapse") : $_("tools.menu.expand")}
					title={expanded ? $_("tools.menu.collapse") : $_("tools.menu.expand")}
				>
					<ChevronDown size={16} />
				</button>
			{/if}
		</div>

		{#if expanded && hasSettings}
			<div class="card-settings">
				<div class="slider-wrapper">
					<Slider
						hideTextInput
						labelText={`${$_("tools.layerManager.opacity")} ` + $opacity + "%"}
						min={0}
						max={100}
						bind:value={$opacity}
					/>
				</div>
			</div>
		{/if}
	</div>

	<button
		class="icon-btn table-btn"
		class:danger={inTable}
		type="button"
		on:click={() =>
			inTable ? controller.removeTableLayer(layerId) : controller.addTableLayer(layerId)}
		aria-label={inTable
			? $_("tools.zonalStatistics.removeFromTable")
			: $_("tools.zonalStatistics.addToTable")}
		title={inTable
			? $_("tools.zonalStatistics.removeFromTable")
			: $_("tools.zonalStatistics.addToTable")}
	>
		{#if inTable}
			<TrashCan size={16} />
		{:else}
			<Add size={16} />
		{/if}
	</button>
</div>

<style>
	.layer-card {
		display: flex;
		align-items: flex-start;
		gap: var(--cds-spacing-02);
		min-width: 0;
	}

	.card-box {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background-color: var(--cds-ui-02);
		border: 1px solid var(--cds-ui-03);
		border-radius: 2px;
		overflow: hidden;
		transition: border-color 0.15s ease;
	}

	/* The selected layer is accented rather than the others being dimmed: an unselected layer can
	   still contribute a table row, so dimming would read as "off". */
	.layer-card.is-selected .card-box {
		border-color: var(--cds-interactive-01);
	}

	/* Fixed height so heads line up whether or not the card renders a chevron, which also keeps the
	   radio circles on an even column and centres the button that sits outside the box. */
	.card-head {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		min-height: 2.5rem;
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
		background-color: var(--cds-ui-01);
		min-width: 0;
	}

	.layer-card.is-selected .card-head {
		background-color: var(--cds-selected-ui);
	}

	.head-label {
		flex: 1;
		min-width: 0;
	}

	/* Keeps Carbon's 1rem small spinner in the same 1.5rem column as the chevron. */
	.card-spinner {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
	}

	.head-label :global(.bx--radio-button-wrapper) {
		margin-right: 0;
		width: 100%;
		min-width: 0;
	}

	/* Carbon's wrapper-scoped rule sets `justify-content:center` + `align-items:flex-start`, which
	   with a full-width label pads both sides and top-aligns the circle against the title. */
	.head-label :global(.bx--radio-button__label) {
		justify-content: flex-start;
		align-items: center;
		width: 100%;
		min-width: 0;
		margin-right: 0;
	}

	/* Carbon renders the label text in the last span; match the layer manager's label-01 title and
	   keep long titles on one line. */
	.head-label :global(.bx--radio-button__label > span:last-child) {
		font-size: 0.75rem;
		line-height: 1.33333;
		letter-spacing: 0.32px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 2px;
		background: none;
		color: var(--cds-icon-primary, #161616);
		cursor: pointer;
		transition: color 0.15s ease, background-color 0.15s ease, transform 0.2s ease;
		text-decoration: none;
	}

	.icon-btn:hover,
	.icon-btn:focus-visible {
		color: var(--cds-link-primary, #0f62fe);
		background-color: var(--cds-hover-ui);
	}

	.icon-btn:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: -2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.icon-btn {
			transition: none;
		}
	}

	/* Sits outside the card box; the 2.5rem hit area centres it against the card head row, while the
	   hover background stays a 1.5rem square to match the panel header buttons. */
	.table-btn {
		flex-shrink: 0;
		height: 1.5rem;
		margin: 0.5rem 0;
		color: var(--cds-link-primary, #0f62fe);
	}

	/* Neutral at rest: a column of permanently red trash icons reads as an error state. */
	.table-btn.danger {
		color: var(--cds-icon-primary, #161616);
	}

	.table-btn.danger:hover,
	.table-btn.danger:focus-visible {
		color: var(--cds-support-01, #da1e28);
	}

	.expand-btn.open {
		transform: rotate(180deg);
	}

	.card-settings {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-ui-03);
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
</style>
