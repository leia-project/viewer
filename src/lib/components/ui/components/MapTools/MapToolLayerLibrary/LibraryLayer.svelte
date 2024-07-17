<script lang="ts">
	import { Checkbox } from "carbon-components-svelte";

	import type { LayerConfig} from "$lib/components/map-core/layer-config";
	import type { LayerLibrary } from "$lib/components/map-core/layer-library";

	export let library: LayerLibrary;
	export let config: LayerConfig;

	$: addToManager = config.added;
    $: selectedLayerConfig = library.selectedLayerConfig;

	function selectLayerConfig(): void {
		selectedLayerConfig.set(config);
	}
	
</script>

<div class="layer" class:layer--selected={$selectedLayerConfig === config}>
	<div class="layer-cb">
		<Checkbox hideLabel bind:checked={$addToManager} />
	</div>

	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="layer-title" on:click={selectLayerConfig} role="button" tabindex="0">
		{config.title}
	</div>
</div>

<style>
	.layer {
		display: flex;
		justify-content: left;
		align-items: stretch;
	}

	.layer:hover {
		background-color: var(--cds-ui-03);
	}

    .layer--selected {
        background-color: var(--cds-ui-03);
    }

	.layer-cb {
		margin-left: var(--cds-spacing-01);
		flex-shrink: 1;
	}

	.layer-title {
		margin-left: var(--cds-spacing-03);
		flex-grow: 1;
		padding-top: 2px;
		cursor: pointer;
		display: flex;
		align-items: center;
	}
</style>
