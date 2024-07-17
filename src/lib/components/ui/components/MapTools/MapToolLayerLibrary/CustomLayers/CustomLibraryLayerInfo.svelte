<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { _ } from "svelte-i18n";
    import { Checkbox, Dropdown, TextInput, Button } from "carbon-components-svelte";
    import Add from "carbon-icons-svelte/lib/Add.svelte";
    import Subtract from "carbon-icons-svelte/lib/Subtract.svelte";
    import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";

	import Divider from "$lib/components/ui/components/Divider/Divider.svelte";
    import type { CustomLayerConfigTracker } from "./custom-layer-config";

    export let custom: CustomLayerConfigTracker;

    let config = custom.layerConfig;
    config.ready = true;

    $: title = custom.titleInput;
    $: type = custom.layerTypeInput;
    $: settings = custom.settingsInput;
    $: added = custom.added;

    $: typeValidation = custom.validType;
    $: urlValidation = custom.validUrl;
    $: isValid = custom.isValid;

    const dispatch = createEventDispatcher();


</script>

<div class="wrapper">
	<div class="overview">
        <div class="header">
		    <div class="heading-03">
                {$_("tools.layerLibrary.myDataTitle")}: {$title}
            </div>
            <div class="delete-btn">
                <Button 
                    kind="danger"
                    icon={TrashCan}
                    on:click={() => dispatch("deleteLayer", custom)}
                >{$_("tools.layerLibrary.deleteLayer")}</Button>
            </div>
        </div>
        <Divider />
        <div class="input-fields">
            <div class="input-field">
                <div class="input-field-label">{$_("tools.layerLibrary.layerName")}</div>
                <TextInput
                    placeholder={$_("tools.layerLibrary.layerNamePlaceholder")}
                    bind:value={$title}
                />
            </div>
            <div class="input-field">
                <div class="input-field-label">{$_("tools.layerLibrary.layerType")}</div>
                <Dropdown
                    hideLabel
                    selectedId={$type}
                    items={[
                        { id: "3dtiles", text: "3D Tiles" },
                        { id: "wms", text: "WMS" },
                        { id: "wmts", text: "WMTS" },
                        { id: "geojson", text: "GeoJSON" },
                        { id: "modelanimation", text: "Animated model from GeoJSON" },
                        { id: "arcgis", text: "ArcGIS Map Service" }
                    ]}
                    on:select={(e) => type.set(e.detail.selectedId)}
                    invalid={!$typeValidation}
                    invalidText={$_("tools.layerLibrary.invalidTypeText")}
                />
            </div>
            {#if $type}
                <div class="input-field">
                    <div class="input-field-label">URL</div>
                    <TextInput
                        placeholder={$_("https://")}
                        bind:value={$settings.url}
                        invalid={!$urlValidation}
                        invalidText={$_("tools.layerLibrary.invalidUrlText")}

                    />
                </div>
            {/if}

            {#if $type === "wms" || $type === "wmts"}
                <div class="input-field">
                    <div class="input-field-label">Feature name</div>
                    <TextInput
                        bind:value={$settings.featureName}
                        invalid={!$settings.featureName}
                    />
                </div>
                <div class="input-field">
                    <div class="input-field-label">Content type</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.contentTypePlaceholder")}
                        bind:value={$settings.contenttype}
                    />
                </div>
            {/if}

            {#if $type === "3dtiles"}
                <Checkbox
                    labelText={$_("tools.layerLibrary.enableClipping")}
                    bind:checked={$settings.enableClipping}
                />
            {/if}

            {#if $type === "geojson"}
                <div class="input-field">
                    <div class="input-field-label">{$_("tools.layerLibrary.styling")}</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.geojsonStylePlaceholder")}
                        bind:value={$settings.theme}
                    />
                </div>
            {/if}

            {#if $type === "arcgis"}
                <div class="input-field">
                    <div class="input-field-label">Layers</div>
                    <TextInput
                        placeholder="Comma-separated list of ArcGIS map layers"
                        bind:value={$settings.layers}
                    />
                </div>
            {/if}

            {#if $type === "modelanimation"}
                <div class="input-field">
                    <div class="input-field-label">Model URL</div>
                    <TextInput
                        placeholder={$_("https://")}
                        bind:value={$settings.modelUrl}
                    />
                </div>
                <div class="input-field">
                    <div class="input-field-label">Time key</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.timeKeyPlaceholder")}
                        bind:value={$settings.timeKey}
                    />
                </div>
                <div class="input-field">
                    <div class="input-field-label">Orientation key</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.orientationKeyPlaceholder")}
                        bind:value={$settings.orientationKey}
                    />
                </div>
                <div class="input-field">
                    <Checkbox
                        labelText={$_("tools.layerLibrary.clampToTerrain")}
                        bind:checked={$settings.clampToTerrain}
                    />
                </div>
            {/if}
        </div>
    </div>
    <div class="btn-float">
        {#if !$added}
            <Button 
                on:click={() => custom.added.set(true)}
                disabled={!$isValid}
                icon={Add}
            >{$_("tools.layerLibrary.btnAddToMap")}</Button>
        {:else}
            <Button 
                kind="danger" 
                on:click={() => custom.added.set(false)}
                icon={Subtract}
            >{$_("tools.layerLibrary.btnRemoveFromMap")}</Button>
        {/if}
    </div> 
</div>

<style>
	.wrapper {
		position: relative;
		height: 100%;
        width: 100%;
		display: flex;
		flex-direction: column;
        max-width: 65rem;
	}
    .overview {
        height: 100%;
		overflow-y: auto;
	}
    .header {
        width: 100%;
        padding: var(--cds-spacing-03) 0rem var(--cds-spacing-03) 0px;
        display: flex;
        justify-content: space-between;
    }
    .input-fields {
        padding: 30px 20px 0;
        max-width: 40rem;
    }
    .input-field {
        margin-bottom: 20px;
    }

    .btn-float {
        position: absolute;
        bottom: 0;
        right: 0;
    }
	
</style>
