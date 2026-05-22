<script lang="ts">
	import { get } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Slider, RadioButtonGroup, RadioButton } from "carbon-components-svelte";
	import { app } from "$lib/app/app";

	export let textOpacity = get(_)("tools.backgroundControls.opacity");
	export let textTerrain = get(_)("tools.backgroundControls.terrain");

	const map = app.map;

	$: globeOpacity = $map?.options.globeOpacity;
	$: terrainProviders = $map?.options.terrainProviders;
	$: selectedTerrainProvider = $map?.options.selectedTerrainProvider;
	$: selected = $selectedTerrainProvider ? $selectedTerrainProvider.title : "";

	function changeTerrainProvider(provider: { title: string; url: string; vertexNormals: boolean }) {
		$map?.options.selectedTerrainProvider.set(provider);
	}

</script>

<div class="custom">
	{#if $terrainProviders && $terrainProviders.length > 1}
		<RadioButtonGroup legendText={textTerrain} selected="standard" orientation="vertical">
			{#each $terrainProviders as tp}
				<RadioButton
					labelText={tp.title}
					value={tp}
					checked={selected === tp.title}
					on:change={() => {
						changeTerrainProvider(tp);
						//FINN TODO: terrain provider visuals dont update even though the provider is changed
					}}
				/>
			{/each}
		</RadioButtonGroup>

		<div class="spacer" />
	{/if}

	<Slider
		hideTextInput
		labelText={textOpacity + " " + $globeOpacity + "%"}
		min={0}
		max={100}
		bind:value={$globeOpacity}
		step={1}
	/>
</div>

<style>
	.custom {
		width: 100%;
		padding-top: var(--cds-spacing-05);
	}

	.spacer {
		margin-top: var(--cds-spacing-05);
	}
</style>
