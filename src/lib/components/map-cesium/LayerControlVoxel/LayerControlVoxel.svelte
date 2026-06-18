<script lang="ts">
	import { RadioButtonGroup, RadioButton, Button } from "carbon-components-svelte";
	import { _ } from "svelte-i18n";
	import RangeSlider from "$lib/components/ui/components/RangeSlider/RangeSlider.svelte";
	import type { VoxelLayer } from "../module/layers/voxel-layer";

	export let layer: VoxelLayer;

	$: selected = layer.selectedProperty;
	$: properties = layer.resolvedProperties;
	$: hiddenValues = layer.hiddenValues;
	$: clipping = layer.clipping;
	$: activeProp = $properties.find((p) => p.name === $selected);
	$: hiddenForProp = $hiddenValues.get($selected) ?? new Set();
	$: isClipped =
		$clipping.x[0] > 0 ||
		$clipping.x[1] < 1 ||
		$clipping.y[0] > 0 ||
		$clipping.y[1] < 1 ||
		$clipping.z[0] > 0 ||
		$clipping.z[1] < 1;

	const asPercent = (v: number) => `${Math.round(v * 100)}%`;
</script>

{#if layer && $properties.length}
	<div class="wrapper">
		<div class="label-01 label">{$_("tools.voxel.property")}</div>

		<RadioButtonGroup orientation="vertical" bind:selected={$selected}>
			{#each $properties as prop}
				<RadioButton labelText={prop.label} value={prop.name} />
			{/each}
		</RadioButtonGroup>

		{#if activeProp}
			<div class="legend">
				<div class="label-01 label">{$_("tools.voxel.legend")}</div>

				{#each activeProp.categories as cat}
					{@const hidden = hiddenForProp.has(cat.value)}
					<div class="legend-entry" data-hidden={hidden}>
						<button
							type="button"
							class="legend-rect"
							style="background-color: rgb({cat.color[0]}, {cat.color[1]}, {cat.color[2]});"
							aria-pressed={hidden}
							on:click={() => layer.toggleHidden($selected, cat.value)}
						/>

						<div class="legend-label">{cat.label}</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="slicing">
			<div class="label-01 label">{$_("tools.voxel.slicing")}</div>

			<RangeSlider
				label={$_("tools.voxel.westEast")}
				value={$clipping.x}
				format={asPercent}
				on:change={(e) => layer.setClip("x", e.detail)}
			/>

			<RangeSlider
				label={$_("tools.voxel.southNorth")}
				value={$clipping.y}
				format={asPercent}
				on:change={(e) => layer.setClip("y", e.detail)}
			/>

			<RangeSlider
				label={$_("tools.voxel.vertical")}
				value={$clipping.z}
				format={asPercent}
				on:change={(e) => layer.setClip("z", e.detail)}
			/>

			<Button kind="ghost" size="small" disabled={!isClipped} on:click={() => layer.resetClip()}>
				{$_("tools.voxel.resetSlicing")}
			</Button>
		</div>
	</div>
{/if}

<style>
	.wrapper {
		padding-bottom: var(--cds-spacing-02);
	}

	.label {
		padding-bottom: var(--cds-spacing-02);
	}

	.legend {
		position: relative;
		padding-top: var(--cds-spacing-05);
	}

	.slicing {
		padding-top: var(--cds-spacing-05);
		display: flex;
		flex-direction: column;
		row-gap: var(--cds-spacing-05);
	}

	.legend-entry {
		width: 100%;
		padding: 2px;
		color: var(--tosti-color-text-primary);
		font-weight: 400;
		display: flex;
		align-items: center;
	}

	.legend-rect {
		height: 15px;
		width: 25px;
		border: 1px solid black;
		margin-right: 0.5rem;
		flex-shrink: 0;
		padding: 0;
		cursor: pointer;
	}

	.legend-entry[data-hidden="true"] .legend-rect {
		opacity: 0.25;
	}

	.legend-entry[data-hidden="true"] .legend-label {
		opacity: 0.5;
		text-decoration: line-through;
	}

	.legend-label {
		font-size: 0.75rem;
		line-height: 1.1;
	}
</style>
