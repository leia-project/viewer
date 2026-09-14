<script lang="ts">
	import Divider from "$lib/components/theme/Divider/Divider.svelte";
	import { _ } from "svelte-i18n";
	import { Button, Checkbox, Slider } from "carbon-components-svelte";
	import { Search } from "carbon-icons-svelte";
	import type { Writable } from "svelte/store";
	import type { ProjectLayer } from "../classes/project-layer";

	export let projectLayer: ProjectLayer;
	export let isProcessing: Writable<boolean>;

	$: mapLayer = projectLayer.layer; // Why this does not work with: const mapLayer = projectLayer.layer; ?
	$: tileset = projectLayer.tileset;

	$: hasData = $mapLayer || $tileset;

	$: opacity = $mapLayer?.opacity;
	$: customControls = $mapLayer?.customControls;
	$: hasPanel = $mapLayer?.config.legendSupported || $mapLayer?.config.opacitySupported || ($customControls && $customControls?.length > 0);
	let open: boolean = false;

</script>


{#if $isProcessing || hasData}
	<Divider />
	<li class="project-layer">
		{#if $isProcessing || !hasData}
			<Checkbox skeleton />
		{:else}
			<Checkbox
				bind:checked={projectLayer.on}
			/>
			{$mapLayer?.config.title ?? projectLayer.id}
			<Button
				kind="ghost"
				size="small"
				iconDescription={$_("tools.projects.zoomToLayer")}
				icon={Search}
				on:click={() => projectLayer.flyTo()}
			/>
			{#if hasPanel && $mapLayer}
				<button class="panel-toggle" class:open on:click={() => open = !open}>
					<svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" preserveAspectRatio="xMidYMid meet" width="16" height="16" role="img" aria-label="Expand/Collapse">
						<path d="M22 16L12 26 10.6 24.6 19.2 16 10.6 7.4 12 6z"></path>
					</svg>
				</button>
				<div class="panel" class:open>
					{#if $customControls}
						{#each $customControls as control}
							<svelte:component this={control.component} {...control.props} />
						{/each}
					{/if}
					{#if $mapLayer.config.opacitySupported}
						<Slider hideTextInput labelText={$_("tools.projects.opacity") + ": " + $opacity + "%"} min={0} max={100} bind:value={$opacity} />
					{/if}
					{#if $mapLayer.config.legendSupported}
						<div class="label-01">{$_("tools.projects.legend")}</div>
						<img class="legend" src={$mapLayer.config.legendUrl} alt="legend" />
					{/if}
				</div>
			{/if}
		{/if}
	</li>
{/if}


<style>

	.project-layer {
		display: grid;
		grid-template-columns: 32px 1fr 32px 32px;
		align-items: center;
	}
	
	.panel {
		padding: 10px;
		display: none;
	}

	.toggle-icon {
		display: block;
		transition: transform 0.2s;
		transform: rotate(90deg);
	}

	.open .toggle-icon {
		transform: rotate(-90deg);
	}

	.panel-toggle {
		display: flex;
		justify-content: center;
		border: none;
		cursor: pointer;
	}

	.panel-toggle:hover {
		background-color: transparent;
	}

	.panel.open {
		display: block;
	}
	

</style>