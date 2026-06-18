<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { _ } from "svelte-i18n";
    import { Checkbox, Dropdown, TextInput, Button, ComboBox } from "carbon-components-svelte";
    import { Add, Subtract, TrashCan } from "carbon-icons-svelte";
    import { fetchCapabilitiesLayers, pickPreferredFormat, type CapabilitiesLayer } from "./capabilities";

	import Divider from "$lib/components/theme/Divider/Divider.svelte";
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

    // GetCapabilities-driven layer selection for WMS / WMTS
    let availableLayers: Array<CapabilitiesLayer> = [];
    let layersLoading = false;
    let capabilitiesError = false;
    let manualEntry = false;
    let lastFetchKey = "";
    let autoFilledTitle: string | undefined;
    let fetchTimer: ReturnType<typeof setTimeout> | undefined;


    function scheduleLayerFetch(layerType: string, url: string | undefined, urlValid: boolean): void {
        if ((layerType !== "wms" && layerType !== "wmts") || !url || !urlValid) {
            lastFetchKey = "";
            availableLayers = [];
            capabilitiesError = false;
            layersLoading = false;
            return;
        }
        const key = `${layerType}|${url}`;
        if (key === lastFetchKey) return;
        lastFetchKey = key;
        manualEntry = false;
        if (fetchTimer) clearTimeout(fetchTimer);
        fetchTimer = setTimeout(() => loadLayers(layerType as "wms" | "wmts", url), 500);
    }


    async function loadLayers(layerType: "wms" | "wmts", url: string): Promise<void> {
        layersLoading = true;
        capabilitiesError = false;
        const layers = await fetchCapabilitiesLayers(url, layerType);
        if (lastFetchKey !== `${layerType}|${url}`) return; // ignore stale responses
        availableLayers = layers;
        capabilitiesError = layers.length === 0;
        layersLoading = false;
    }


    function onLayerSelect(detail: { selectedId?: string }): void {
        const layer = availableLayers.find((l) => l.id === detail?.selectedId);
        if (!layer) return;
        $settings.featureName = layer.id;
        const currentTitle = $title?.trim();
        if (!currentTitle || currentTitle === "New layer" || currentTitle === autoFilledTitle) {
            title.set(layer.text);
            autoFilledTitle = layer.text;
        }
        const format = pickPreferredFormat(layer.formats);
        if (format && !$settings.contenttype) {
            $settings.contenttype = format;
        }
        settings.set($settings);
    }

    $: scheduleLayerFetch($type, $settings?.url, $urlValidation);

    onDestroy(() => {
        if (fetchTimer) clearTimeout(fetchTimer);
    });


</script>

<div class="wrapper">
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
	<div class="overview">
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
                    <div class="input-field-label">{$_("tools.layerLibrary.url")}</div>
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
                    <div class="input-field-label">{$_("tools.layerLibrary.featureName")}</div>
                    {#if layersLoading}
                        <ComboBox
                            disabled
                            items={[]}
                            placeholder={$_("tools.layerLibrary.loadingLayers")}
                        />
                    {:else if availableLayers.length > 0 && !manualEntry}
                        <ComboBox
                            items={availableLayers}
                            selectedId={$settings.featureName}
                            placeholder={$_("tools.layerLibrary.selectLayerPlaceholder")}
                            shouldFilterItem={(item, value) =>
                                !value ||
                                item.text.toLowerCase().includes(value.toLowerCase()) ||
                                item.id.toLowerCase().includes(value.toLowerCase())}
                            on:select={(e) => onLayerSelect(e.detail)}
                            invalid={!$settings.featureName}
                            invalidText={$_("tools.layerLibrary.featureNameRequired")}
                        />
                        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                        <span class="link-btn" on:click={() => (manualEntry = true)}>
                            {$_("tools.layerLibrary.enterManually")}
                        </span>
                    {:else}
                        <TextInput
                            bind:value={$settings.featureName}
                            invalid={!$settings.featureName}
                        />
                        {#if capabilitiesError}
                            <div class="hint">{$_("tools.layerLibrary.capabilitiesError")}</div>
                        {/if}
                        {#if availableLayers.length > 0 && manualEntry}
                            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                            <span class="link-btn" on:click={() => (manualEntry = false)}>
                                {$_("tools.layerLibrary.selectFromList")}
                            </span>
                        {/if}
                    {/if}
                </div>
                <div class="input-field">
                    <div class="input-field-label">{$_("tools.layerLibrary.contentType")}</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.contentTypePlaceholder")}
                        bind:value={$settings.contenttype}
                        invalid={!String($settings.contenttype ?? "").trim()}
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
                    <div class="input-field-label">{$_("tools.layerLibrary.layers")}</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.arcgisLayersPlaceholder")}
                        bind:value={$settings.layers}
                    />
                </div>
            {/if}

            {#if $type === "modelanimation"}
                <div class="input-field">
                    <div class="input-field-label">{$_("tools.layerLibrary.modelUrl")}</div>
                    <TextInput
                        placeholder={$_("https://")}
                        bind:value={$settings.modelUrl}
                    />
                </div>
                <div class="input-field">
                    <div class="input-field-label">{$_("tools.layerLibrary.timeKey")}</div>
                    <TextInput
                        placeholder={$_("tools.layerLibrary.timeKeyPlaceholder")}
                        bind:value={$settings.timeKey}
                    />
                </div>
                <div class="input-field">
                    <div class="input-field-label">{$_("tools.layerLibrary.orientationKey")}</div>
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
    <div class="info-footer">
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
        flex: 1 1 auto;
        min-height: 0;
		overflow-y: auto;
	}

    .header {
        flex-shrink: 0;
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

    .link-btn {
        display: inline-block;
        margin-top: var(--cds-spacing-02);
        color: var(--cds-link-01, #0f62fe);
        font-size: var(--cds-label-01-font-size, 0.75rem);
        cursor: pointer;
        text-decoration: underline;
    }

    .hint {
        margin-top: var(--cds-spacing-02);
        color: var(--cds-text-error, #da1e28);
        font-size: var(--cds-label-01-font-size, 0.75rem);
    }

    .info-footer {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: var(--cds-spacing-05);
    }
	
</style>
