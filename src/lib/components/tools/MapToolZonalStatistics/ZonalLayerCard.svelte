<script lang="ts">
	import { Checkbox, Slider } from "carbon-components-svelte";
	import { ChevronDown } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import type { Layer } from "$lib/map-core/layer";

	export let layer: Layer;

	const visible = layer.visible;
	const opacity = layer.opacity;
	const hasSettings = layer.config.opacitySupported;

	let expanded = false;
</script>

<div class="layer-card" class:is-hidden={!$visible}>
	<div class="card-head">
		<div class="head-toggle">
			<Checkbox
				title={$visible ? $_("general.off") : $_("general.on")}
				bind:checked={$visible}
			/>
		</div>
		<button
			class="title-btn"
			type="button"
			on:click={() => ($visible = !$visible)}
			title={layer.title}
		>
			<span class="layer-title label-01">{layer.title}</span>
		</button>
		<div class="head-actions">
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
		background-color: transparent;
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
