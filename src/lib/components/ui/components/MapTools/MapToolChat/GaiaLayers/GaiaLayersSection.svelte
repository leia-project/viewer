<script lang="ts">
	import { Accordion, Checkbox } from "carbon-components-svelte";

	import LayerControl from "../../MapToolLayerManager/MapToolLayerControl.svelte";
	import { GAIA_GROUP_ID, GAIA_GROUP_TITLE } from "./gaia-layers";

	import type { Layer } from "$lib/components/map-core/layer";
	import type { LayerLibrary } from "$lib/components/map-core/layer-library";

	export let library: LayerLibrary;
	/* The layers on the map: a dataset that is added is shown with the full layer controls. */
	export let layers: Array<Layer>;
	export let textOpacity: string;

	$: libraryGroups = library.groups;
	/* The group appears once the datasets have been fetched, and is a new store then. */
	const findGroup = (_groups: unknown) => library.findGroup(GAIA_GROUP_ID);
	$: group = findGroup($libraryGroups);
	$: configs = group?.layerConfigs;

	/* Looked up in the template with `layers` itself: a helper function would hide the
       dependency from Svelte and the rows would not follow the layers on the map. */
</script>

{#if group && $configs && $configs.length > 0}
	<div class="bx--label gaia-label">{GAIA_GROUP_TITLE}</div>
	<Accordion class="layer-group-accordion">
		{#each $configs as config (config.id)}
			{@const layer = layers.find((candidate) => candidate.config === config)}
			{#if layer}
				<LayerControl {layer} {textOpacity} />
			{:else}
				<div class="dataset" title={config.description}>
					<Checkbox
						checked={false}
						labelText={config.title}
						on:check={() => config.added.set(true)}
					/>
				</div>
			{/if}
		{/each}
	</Accordion>
{/if}

<style>
	.gaia-label {
		margin-top: var(--cds-spacing-05);
	}

	.dataset {
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
	}
</style>
