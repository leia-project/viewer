<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Dropdown, Slider } from "carbon-components-svelte";

	import type { MvtLayer } from "$lib/map-cesium/layers/mvt-layer";
	import type { DataDrivenStyle } from "$lib/map-cesium/providers/mvt-style";

	/* Style of an MVT layer: colours, line width, point size, and colouring by property. Every
	   change rebuilds the imagery layer (tiles are fixed once drawn); MvtLayer waits until the
	   changes settle before doing so.

	   The point size stops at 15: a tile only carries a small buffer beyond its edge, and a
	   larger point would be clipped at the tile border. */
	export let layer: MvtLayer;

	const { style, dataDriven } = layer;

	const NONE = "";
	$: items = [
		{ id: NONE, text: $_("tools.layerManager.styleDefault") },
		...layer.properties.map(({ name }) => ({ id: name, text: name }))
	];
	$: active = $dataDriven?.property ?? NONE;

	let error = "";
	async function colorBy(property: string) {
		error = "";
		try {
			await layer.colorBy(property || undefined);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	/* Point size only for layers with points. For a points-only layer the outline colour and
	   width belong to the point (pointStroke*); otherwise to lines and polygons (stroke*). */
	const showPointSize = layer.drawsPoints;
	const pointOutline = layer.onlyPoints;
	$: outlineColor = pointOutline ? $style.pointStrokeColor : $style.strokeColor;
	$: outlineWidth = pointOutline ? $style.pointStrokeWidth : $style.strokeWidth;
	const setOutlineColor = (color: string) =>
		layer.setStyle(pointOutline ? { pointStrokeColor: color } : { strokeColor: color });
	const setOutlineWidth = (width: number) =>
		layer.setStyle(pointOutline ? { pointStrokeWidth: width } : { strokeWidth: width });

	const round = (n: number) => Number(n.toPrecision(4));

	/* The classes and their colours, for the legend. */
	function legend(style: DataDrivenStyle | undefined): { label: string; color: string }[] {
		if (!style) return [];
		if (style.kind === "categorical") {
			return (style.categories ?? []).map(({ value, color }) => ({ label: value, color }));
		}
		if (style.kind === "rules") {
			return [
				...(style.rules ?? []).map(({ label, color }) => ({ label, color })),
				{ label: $_("tools.layerManager.allOther"), color: style.fallbackColor }
			];
		}
		const breaks = style.breaks ?? [];
		return (style.colors ?? []).map((color, i) => ({
			color,
			label:
				i === 0
					? `< ${round(breaks[0])}`
					: i < breaks.length
						? `${round(breaks[i - 1])} – ${round(breaks[i])}`
						: `≥ ${round(breaks[i - 1])}`
		}));
	}
	$: classes = legend($dataDriven);
</script>

<div class="mvt-styling">
	{#if layer.properties.length > 0}
		<div class="control-section">
			<Dropdown
				titleText={$_("tools.layerManager.styling")}
				selectedId={active}
				{items}
				size="sm"
				on:select={(e) => colorBy(e.detail.selectedId)}
			/>
			{#if error}<div class="error">{error}</div>{/if}
		</div>
	{/if}

	{#if classes.length > 0}
		<div class="control-section">
			<div class="control-header">{$_("tools.layerManager.legend")}</div>
			{#each classes as item}
				<div class="legend-item">
					<div class="legend-color" style="background-color: {item.color}"></div>
					<div class="legend-text">{item.label}</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="control-section colors">
			<label>
				{$_("tools.layerManager.fillColor")}
				<input type="color" value={$style.fillColor} on:change={(e) => layer.setStyle({ fillColor: e.currentTarget.value })} />
			</label>
			<label>
				{$_("tools.layerManager.strokeColor")}
				<input type="color" value={outlineColor} on:change={(e) => setOutlineColor(e.currentTarget.value)} />
			</label>
		</div>
	{/if}

	<div class="control-section">
		<Slider
			value={outlineWidth}
			labelText={$_("tools.layerManager.strokeWidth")}
			fullWidth={true}
			hideTextInput={true}
			min={0}
			max={10}
			step={0.5}
			minLabel="0"
			maxLabel="10"
			on:change={(e) => setOutlineWidth(e.detail)}
		/>
	</div>
	{#if showPointSize}
		<div class="control-section">
			<Slider
				value={$style.pointRadius}
				labelText={$_("tools.layerManager.pointRadius")}
				fullWidth={true}
				hideTextInput={true}
				min={1}
				max={15}
				step={1}
				minLabel="1"
				maxLabel="15"
				on:change={(e) => layer.setStyle({ pointRadius: e.detail })}
			/>
		</div>
	{/if}
</div>

<style>
	.mvt-styling {
		margin: 15px 0;
	}
	.control-header {
		margin-bottom: 8px;
	}
	.control-section {
		margin: 15px 0;
	}
	.colors {
		display: flex;
		gap: 20px;
	}
	.colors label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.colors input {
		width: 32px;
		height: 24px;
		padding: 0;
	}
	.legend-item {
		display: grid;
		grid-template-columns: 20px 1fr;
		grid-gap: 10px;
		margin-top: 6px;
	}
	.legend-color {
		height: 100%;
		width: 100%;
		border: 1px solid #000;
		border-radius: 4px;
	}
	.error {
		margin-top: 6px;
		color: var(--cds-support-01, #da1e28);
		font-size: 0.75rem;
	}
</style>
