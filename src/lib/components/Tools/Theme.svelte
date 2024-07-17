<script lang="ts">
	import * as Cesium from 'cesium';
	import { getContext } from 'svelte';
	import Legend from "carbon-icons-svelte/lib/Legend.svelte";
	import Divider from "$lib/components/ui/components/Divider/Divider.svelte";
	import { MapToolMenuOption } from '$lib/components/ui/components/MapToolMenu/MapToolMenuOption';
	import { RadioButtonGroup, RadioButton } from "carbon-components-svelte";
	import { writable, get } from 'svelte/store';
	import type { Writable } from 'svelte/store';
	import type { CameraLocation } from "$lib/components/map-core/camera-location";

	const { registerTool, selectedTool, map } = getContext<any>('mapTools');

	let id: string = 'theme';
	let icon: any = Legend;
	let label: Writable<string> = writable('Thema');
	let tool = new MapToolMenuOption(id, icon, 'Thema');
	$: { tool.label.set($label); }

	let selected: Writable<string> = writable('');
	let legend: Array<{[k: string]: any}>;
	let settings: Writable<any> = writable(undefined);
	let tileset: any = undefined;
	let themes: any = [];
	let selectedTheme: any = undefined;
	let hoverLegendIndex: number | undefined = undefined;
	let layerConfig: any = undefined;
	let location: CameraLocation | undefined = undefined;

	settings.subscribe((s) => {
		if (!s) {
			return;
		}

		label.set(s.title);
		themes = s.themes;
		layerConfig = s.layer;
		location = s.location ? s.location : undefined;
		selected.set(s.default);

		setTimeout(function () {
			addLayer();
		}, 3000);
	});

	tool.settings.subscribe((s) => {
		if (s) {
			settings.set(s);
		}
	});

	selected.subscribe((value) => {
		themeChanged(getThemeById(value));
	});

	selectedTool.subscribe((tool: MapToolMenuOption) => {
		if (tool && tool.id === id) {
			showLayer();
			flyTo();
		}
	});

	registerTool(tool);

	function addLayer() {
		map.addLayerInternal(layerConfig);
		const l = map.getLayerById(layerConfig.id);
		tileset = l.source;
		themeChanged(getThemeById(get(selected)));
		showLayer();
	}

	function flyTo() {
		if (location) {
			map.flyTo(location);
		}
	}

	function showLayer() {
		if (!layerConfig) {
			return;
		}

		const l = map.getLayerById(layerConfig.id);
		if (!l) {
			return;
		}

		l.show();
	}

	function getThemeById(themeId: string) {
		for (let i = 0; i < themes.length; i++) {
			if (themes[i].title === themeId) {
				return themes[i];
			}
		}

		return undefined;
	}

	function themeChanged(theme: any) {
		if (!tileset || !theme) {
			return;
		}

		selectedTheme = theme;
		tileset.style = new Cesium.Cesium3DTileStyle({
			color: {
				conditions: theme.conditions
			}
		});

		legend = theme.legend;
		map.refresh();
	}

	function highlight(color: string, hoverIndex: number) {
		hoverLegendIndex = hoverIndex;
		const newConditions = [];

		for (let i = 0; i < selectedTheme.conditions.length; i++) {
			let condition = selectedTheme.conditions[i];
			let conditionColor = condition[1];
			let alpha = 0.1;

			if (conditionColor.includes(color)) {
				alpha = 1;
			}

			const newColor = conditionColor.replace('color(', '').replace(')', '');
			newConditions.push([condition[0], `color(${newColor}, ${alpha})`]);
		}

		tileset.style = new Cesium.Cesium3DTileStyle({
			color: {
				conditions: newConditions
			}
		});
		map.refresh();
	}

	function resetHighlight() {
		hoverLegendIndex = undefined;
		tileset.style = new Cesium.Cesium3DTileStyle({
			color: {
				conditions: selectedTheme.conditions
			}
		});
		map.refresh();
	}
</script>

	{#if $selectedTool === tool}
		<div class="wrapper">			
			<div class="heading-01">{$label}</div>
			{#if themes}
			<RadioButtonGroup orientation="vertical" bind:selected={$selected}>
				{#each themes as theme}
					<RadioButton labelText={theme.title}  value={theme.title} />
				{/each}
			</RadioButtonGroup>
			{/if}

			<div class="legend">
				<div class="heading-01">{"Legenda"}</div>
				{#if legend}
					{#each legend as entry, i}
						<div
							class="legend-entry"
							class:legend-active={i == hoverLegendIndex}
							on:mouseleave={() => {
								resetHighlight();
							}}
							on:mouseenter={() => {
								highlight(entry["color"], i);
							}}
							role="listitem"
						>
							<div class="legend-rect" style="background-color:{entry.color};" />
							<div class="legend-label">{entry.label}</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

<style>
	.wrapper {
		padding-top: var(--cds-spacing-05);
		padding-left: var(--cds-spacing-05);
		padding-right: var(--cds-spacing-05);
	}

	.legend {
		padding-top: var(--cds-spacing-05);
	}

	.legend-entry {
		width: 100%;
		padding: 2px;
		color: var(--tosti-color-text-primary);
		font-weight: var(--tosti-font-weight-normal);
		cursor: pointer;
	}

	.legend-active {
		background-color: var(--tosti-color-primary-accent);
		color: var(--tosti-color-text-secondary);
		font-weight: var(--tosti-font-weight-bold);
	}

	.legend-rect {
		height: 15px;
		width: 25px;
		border: 1px solid black;
		float: left;
		margin-right: 0.5rem;
	}
</style>
