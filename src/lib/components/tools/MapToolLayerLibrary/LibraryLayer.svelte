<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Checkbox } from "carbon-components-svelte";
	import type { LayerConfig} from "$lib/map-core/layer-config";
	import type { LayerLibrary } from "$lib/map-core/layer-library";

	export let library: LayerLibrary;
	export let config: LayerConfig;

	$: addToManager = config.added;
    $: selectedLayerConfig = library.selectedLayerConfig;

	function toggleLayer(checked: boolean): void {
		if (checked) {
			config.defaultOn = true;
			config.add();
		} else {
			config.remove();
		}
	}

	function selectLayerConfig(): void {
		selectedLayerConfig.set(config);
	}
	
</script>

<div class="layer" class:layer--selected={$selectedLayerConfig === config}>
	<div
		class="layer-cb"
		title={$addToManager
			? $_("tools.layerLibrary.removeLayerTooltip")
			: $_("tools.layerLibrary.addLayerTooltip")}
	>
		<Checkbox hideLabel checked={$addToManager} on:check={(e) => toggleLayer(e.detail)} />
	</div>

	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="layer-title"
		on:click={selectLayerConfig}
		role="button"
		tabindex="0"
		title={config.title}
	>
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
