<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import type { Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Checkbox } from "carbon-components-svelte";

    import type { CustomLayerConfigTracker } from "./custom-layer-config";


	export let customConfig: CustomLayerConfigTracker;
	export let selectedCustomLayer: Writable<CustomLayerConfigTracker | undefined>;


	$: title = customConfig.titleInput;
	$: type = customConfig.layerTypeInput;
	$: typeString = typeToString($type);
	$: isValid = customConfig.isValid;
	$: added = customConfig.added;

	function typeToString(format: string): string {
		switch (format) {
			case "3dtiles":
				return "3D Tiles";
			case "wms":
				return "WMS";
			case "wmts":
				return "WMTS";
			case "geojson":
				return "GeoJSON";
			case "modelanimation":
				return "Animated model";
			case "arcgis":
				return "ArcGIS Map Service";
			default:
				return "";
		}
	}


	function selectLayerConfig(): void {
		if (selectedCustomLayer) selectedCustomLayer.set(customConfig);
	}

	onMount(() => {
		selectLayerConfig();
	});


	let showUrlError = false;
	function showUrlErrorMessage(): void {
		showUrlError = true;
		setTimeout(() => {
			showUrlError = false;
		}, 1500);
	}
	customConfig.on("urlError", () => showUrlErrorMessage());


	const dispatch = createEventDispatcher();
	customConfig.on("updated", () => dispatch("updateLocalStorage"));


</script>



<div class="layer" class:layer--selected={$selectedCustomLayer === customConfig} >
	<div class="layer-cb">
		<Checkbox 
			hideLabel 
			bind:checked={$added} 
			disabled={!$isValid}
		/>
	</div>

	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="layer-title" on:click={selectLayerConfig} role="button" tabindex="0">
		{$title}
	</div>

	{#if $type}
	<div class="layer-validator" class:isValid={$isValid}>
		<span>{typeString}</span>
	</div>
	{/if}

	<div class="url-error-message" class:show={showUrlError}>
		<span>{$_("tools.layerLibrary.urlNotFoundText")}</span>
	</div>

</div>



<style>
	.layer {
		display: flex;
		justify-content: left;
		align-items: stretch;
		position: relative;
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


    .layer-validator {
        position: absolute;
        top: 50%;
        right: 15px;
        transform: translateY(-50%);
        border-radius: 10px;
        overflow: hidden;
        min-width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px 10px;
        color: #fff;
        font-size: 0.8rem;
        pointer-events: none;
		background-color: red;
    }
	.layer-validator.isValid {
		background-color: green;
	}

	.url-error-message {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(255, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		visibility: hidden;
		opacity: 0;
		transition: opacity 0.4s;
	}
	.url-error-message.show {
		visibility: visible;
		opacity: 1;
	}
	.url-error-message span {
		color: #fff;
		font-size: 0.8rem;
	}
	
	
</style>
