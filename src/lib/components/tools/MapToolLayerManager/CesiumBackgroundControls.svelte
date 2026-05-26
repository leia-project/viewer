<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Slider, RadioButtonGroup, RadioButton } from "carbon-components-svelte";
	import { app } from "$lib/app/app";

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
		<RadioButtonGroup legendText={$_("tools.backgroundControls.terrain")} selected="standard" orientation="vertical">
			{#each $terrainProviders as tp}
				<RadioButton
					labelText={tp.title}
					value={tp.title}
					checked={selected === tp.title}
					on:change={() => changeTerrainProvider(tp)}
				/>
			{/each}
		</RadioButtonGroup>

		<div class="spacer" />
	{/if}

	<Slider
		hideTextInput
		labelText={$_("tools.backgroundControls.opacity") + " " + $globeOpacity + "%"}
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
