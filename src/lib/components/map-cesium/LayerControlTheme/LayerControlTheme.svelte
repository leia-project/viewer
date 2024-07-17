<script lang="ts">
	import * as Cesium from "cesium";
	import { _ } from "svelte-i18n";
	import { writable } from "svelte/store";
	import { getContext } from "svelte";
	import { RadioButtonGroup, RadioButton } from "carbon-components-svelte";
	import Reset from "carbon-icons-svelte/lib/Reset.svelte";
	import { Button } from "carbon-components-svelte";

	import type { Writable } from "svelte/store";
	import type { ThreedeeLayer } from "../module/layers/threedee-layer";

	export let layer: ThreedeeLayer;
	export let themes: any;
	export let defaultTheme: string | undefined;

	const { map } = getContext<any>("mapTools");
	let defaultStyle = layer.getEmptyTheme();
	let selected: Writable<string> = writable(defaultTheme ?? "default");
	let legend: Array<{ [k: string]: any }> | undefined;
	let selectedTheme: any = undefined;
	let hoverLegendIndex: number | undefined = undefined;
	let activeLegendEntries = writable<Array<number>>(new Array<number>());

	selected.subscribe((value) => {
		themeChanged(layer.getThemeById(value));
	});

	function themeChanged(theme: any) {
		resetActiveLegendEntries();

		if (!layer.source || !theme) {
			resetTheme();
			return;
		}

		selectedTheme = theme;
		legend = theme.legend;

		highlight();
	}

	function resetTheme() {
		if(!layer.source) return;
		
		selectedTheme = undefined;
		layer.source.style =  defaultStyle;
		legend = undefined;

		map.refresh();
	}

	function highlight() {
		if(!selectedTheme) {
			return;
		}
		
		const newConditions = [];

		for (let i = 0; i < selectedTheme.conditions.length; i++) {
			let condition = selectedTheme.conditions[i];
			let conditionColor = condition[1];
			let alpha = 0.1;

			if (
				$activeLegendEntries.includes(i - 1) ||
				hoverLegendIndex === i - 1 ||
				($activeLegendEntries.length === 0 && !hoverLegendIndex) ||
				i === 0
			) {
				alpha = 1;
			}

			const newColor = conditionColor.replace("color(", "").replace(")", "");
			newConditions.push([condition[0], `color(${newColor}, ${alpha})`]);
		}

		layer.source.style = new Cesium.Cesium3DTileStyle({
			color: {
				conditions: newConditions
			}
		});

		map.refresh();
	}

	function resetActiveLegendEntries(): void {
		activeLegendEntries.set([]);

		// needed else activeLgendEntries is not empty on highlighting
		setTimeout(function () {
			highlight();
		}, 10);
	}

	function resetHoverHighlight() {
		hoverLegendIndex = undefined;
		highlight();
	}

	function hoverHighlight(hoverIndex: number): void {
		hoverLegendIndex = hoverIndex;
		highlight();
	}

	function addHighlight(index: number) {
		const le = $activeLegendEntries;
		if (le.includes(index)) {
			le.splice(le.indexOf(index), 1);
			activeLegendEntries.set([...le]);
		} else {
			le.push(index);
			activeLegendEntries.set([...le]);
		}

		highlight();
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if layer}
	<div class="wrapper">
		<div class="label-01 label">{$_("tools.layerTools.theme.label")}</div>
		{#if themes}
			<RadioButtonGroup orientation="vertical" bind:selected={$selected}>
				<RadioButton labelText={$_("tools.layerTools.theme.default")} value="default" />
				{#each themes as theme}
					<RadioButton labelText={theme.title} value={theme.title} />
				{/each}
			</RadioButtonGroup>
		{/if}
		{#if legend}
			<div class="legend">
				<div class="label-01 label">{$_("tools.layerTools.theme.legend")}</div>
				{#each legend as entry, i}
					<div
						class="legend-entry"
						class:legend-active={$activeLegendEntries.includes(i) || hoverLegendIndex === i}
						on:mouseleave={() => {
							resetHoverHighlight();
						}}
						on:mouseenter={() => {
							hoverHighlight(i);
						}}
						on:click={() => {
							addHighlight(i);
						}}
						role="button"
						tabindex="0"
					>
						<div class="legend-rect" style="background-color:{entry.color};" />
						<div class="legend-label">{entry.label}</div>
					</div>
				{/each}
				{#if $activeLegendEntries.length > 0}
					<div class="reset-icon">
						<Button
							on:click={() => {
								resetActiveLegendEntries();
							}}
							iconDescription={$_("tools.layerTools.theme.reset")}
							icon={Reset}
							tooltipPosition="left"
							tooltipAlignment="end"
							kind="ghost"
							size="small"
						/>
					</div>
				{/if}
			</div>
		{/if}
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

	.legend-entry {
		width: 100%;
		padding: 2px;
		color: var(--tosti-color-text-primary);
		font-weight: 400;
		cursor: pointer;
	}

	.legend-active {
		color: var(--cds-text-01);
		font-weight: 600;
		background-color: var(--cds-ui-01);
	}

	.legend-rect {
		height: 15px;
		width: 25px;
		border: 1px solid black;
		float: left;
		margin-right: 0.5rem;
	}

	.reset-icon {
		position: absolute;
		top: var(--cds-spacing-02);
		right: 0px;
	}
</style>
