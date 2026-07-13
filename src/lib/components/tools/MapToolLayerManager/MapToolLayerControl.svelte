<script context="module" lang="ts">
    import { XMLParser } from 'fast-xml-parser';

    const capabilitiesParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        trimValues: true,
        parseTagValue: true,
        parseAttributeValue: true,
        isArray: (tagName) => tagName === 'Style'
    });

    // Cache parsed GetCapabilities documents so each endpoint is fetched and parsed only once
    const capabilitiesCache = new Map<string, Promise<any>>();

    function getCapabilities(getCapabilitiesUrl: string): Promise<any> {
        let cached = capabilitiesCache.get(getCapabilitiesUrl);
        if (!cached) {
            cached = (async () => {
                const response = await fetch(getCapabilitiesUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const xmlText = await response.text();
                return capabilitiesParser.parse(xmlText);
            })();
            capabilitiesCache.set(getCapabilitiesUrl, cached);
        }
        return cached;
    }
</script>

<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { _ } from "svelte-i18n";
    import { Slider, Checkbox, Button, AccordionItem, Dropdown } from "carbon-components-svelte";
	import { Search, TrashCan, Information } from "carbon-icons-svelte";

    import type { Layer } from "$lib/map-core/layer";
    import ErrorMessage from "$lib/components/theme/ErrorMessage/ErrorMessage.svelte"
    import ExpandableDescription from "$lib/components/theme/ExpandableDescription/ExpandableDescription.svelte"

    const { map } = getContext<any>("mapTools");

    export let layer: Layer;
    export let active: boolean = false;

    let open: boolean;
    let imageValid: boolean = true;
    let descriptionValid: boolean = true;
    let items: { id: string; text: string }[] = [];
    let metadataUrl: string | undefined = undefined;
    
    const defaultLegendUrl = layer.config.legendUrl;
    const hasConfigLegendUrl = defaultLegendUrl !== undefined && defaultLegendUrl !== "";
    let legendUrl: string | undefined = undefined; // The actual URL used to render the legend image

    const visible = layer.visible;
    const opacity = layer.opacity;
    const customControls = layer.customControls;
    const cameraPosition = layer.config.cameraPositionStore;

    function buildGetCapabilitiesUrl(baseUrl: string, featureName?: string): string {
        // Restrict global capabilities to the layer's workspace if possible
        const namespace = featureName && featureName.includes(":") ? featureName.split(":")[0] : undefined;
        try {
            const url = new URL(baseUrl);
            url.searchParams.set("service", "WMS");
            url.searchParams.set("request", "GetCapabilities");
            if (namespace) url.searchParams.set("namespace", namespace);
            return url.toString();
        } catch {
            // Fallback for relative/invalid URLs: append params with the correct separator
            const trimmed = baseUrl.replace(/\?$/, "");
            const separator = trimmed.includes("?") ? "&" : "?";
            let result = `${trimmed}${separator}service=WMS&request=GetCapabilities`;
            if (namespace) result += `&namespace=${namespace}`;
            return result;
        }
    }

    async function getMetadataURL(getCapabilitiesUrl: string, featureName: string) {
        try {
            const parsedXml = await getCapabilities(getCapabilitiesUrl);
            let foundMetadataUrl: string | undefined = undefined;

            if (parsedXml) {
                const layerData = parsedXml.WMS_Capabilities.Capability.Layer.Layer;
                const layers = Array.isArray(layerData) ? layerData : [layerData];

                layers.forEach((layer: { Name: string; DataURL: any; MetadataURL: any }) => {
                    if (layer.Name === featureName) {
                        foundMetadataUrl = layer.DataURL?.OnlineResource?.['xlink:href'] ||
                            layer.MetadataURL?.OnlineResource?.['xlink:href'];
                    }
                });
            };

            return foundMetadataUrl;

        } catch (error) {
            console.error("Error fetching WMS GetCapabilities:", error);
            return undefined;
        };
    };

    async function getWMSStyleNames(getCapabilitiesUrl: string, featureName: string) {
        try {
            const parsedXml = await getCapabilities(getCapabilitiesUrl);

            const styleNames: { id: string; text: string, legendURL: string | undefined }[] = [];
            if (parsedXml) {
                const layerData = parsedXml.WMS_Capabilities.Capability.Layer.Layer;
                const layers = Array.isArray(layerData) ? layerData : [layerData];

                layers.forEach((layer: { Name: string; Style: { Title: any; Name: string; LegendURL?: any }[] }) => {
                    if (layer.Name === featureName) {
                        layer.Style.forEach((style, index) => {
                            imageValid = true;
                            const styleName = style.Title;
                            const styleId = style.Name;
                            
                            // Use config legend URL if available, otherwise use style's legend URL
                            const styleLegendUrl = hasConfigLegendUrl 
                                ? defaultLegendUrl 
                                : style.LegendURL?.OnlineResource?.["xlink:href"];
                            
                            // Set the first item's legend as the initial display
                            if (index === 0) {
                                legendUrl = styleLegendUrl;
                            }
                            
                            styleNames.push({
                                id: styleId,
                                text: styleName,
                                legendURL: styleLegendUrl
                            });
                        });
                    }
                });
            };

            return styleNames;

        } catch (error) {
            console.error("Error fetching WMS GetCapabilities:", error);
            return [];
        };
    };

    function removeLayer() {
        layer.remove();
    }

    function zoomToLayer() {
        const pos = layer.getLayerPosition();
        if (pos) map.flyTo(pos);
    }

    onMount(async() => {
        if (layer.config.metadataLink || layer.config.metadataUrl) {
            // Layers added from the layer library already carry a metadata page link
            metadataUrl = layer.config.metadataLink || layer.config.metadataUrl;
        } else if (layer.config.type === "wms") {
            const featureName = layer.config.settings?.featureName;
            const WMSUrl = buildGetCapabilitiesUrl(layer.config.settings?.url, featureName);
            metadataUrl = await getMetadataURL(WMSUrl, featureName);
        }
        if (!layer.config.legendSupported) {
            return;
        }
        if (layer.config.type !== "wms" || !layer.config.settings?.tools?.styleSwitcher?.enabled) {
            // If style switcher is disabled, use the config legend URL
            legendUrl = defaultLegendUrl;
        }
        else {
            const featureName = layer.config.settings?.featureName;
            const WMSUrl = buildGetCapabilitiesUrl(layer.config.settings?.url, featureName);
            try {
                items = await getWMSStyleNames(WMSUrl, featureName);
            } catch(error) {
                console.error("Failed to load styles:", error);
            }
        }
    });

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<AccordionItem class="layer-control" bind:open>
    <svelte:fragment slot="title">
        <div class="item-header">
            <div class="layer-cb">
                <Checkbox
                    title={$visible ? $_("general.off") : $_("general.on")}
                    bind:checked={$visible}
                    on:click={(e) => {
                        e.stopPropagation();
                        return false;
                    }}
                />
            </div>
            <div
                class="layer-title-wrap"
                on:click={(e) => {
                    $visible = !$visible;
                    e.stopPropagation();
                    return false;
                }}
                role="button"
                tabindex="0"
            >
                <div class="label-01 layer-title" class:layer-title-open={open} title={layer.title}>
                    {layer.title}
                </div>
            </div>
            {#if metadataUrl}
                <a
                    href={metadataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="metadata-link"
                    title={$_("tools.layerManager.openMetadata")}
                    aria-label={$_("tools.layerManager.openMetadata")}
                >
                    <Information size={16} />
                </a>
            {/if}
        </div>
    </svelte:fragment>

    <div class="panel" class:panel-active={active}>
        {#if $customControls}
            {#each $customControls as control}
                <svelte:component this={control.component} {...control.props} />
            {/each}
        {/if}
        {#if layer.config.descriptionSupported}
            {#if descriptionValid && layer.config.description}
                <ExpandableDescription text={layer.config.description} />
            {/if}
        {/if}
        {#if layer.config.type === "wms" && layer.config.settings?.tools?.styleSwitcher?.enabled == true}        
            <div class="style-switcher">
                <Dropdown
                    titleText={$_("tools.layerManager.styling")}
                    size="sm"
                    selectedId={layer.config.settings?.styles || items[0]?.id} 
                    items={items}
                    on:select={(e) => {
                        const WMSLayer = map.getLayerById(layer.config.id);
                        //@ts-ignore
                        legendUrl = e.detail.selectedItem.legendURL;

                        WMSLayer.switchLayer(e.detail.selectedItem.id);
                    }}
                />
            </div>
        {/if}
        {#if layer.config.legendSupported}
            <div class="label-01 legend-header">
                {$_("tools.layerManager.legend")}
            </div>
            {#if imageValid && legendUrl !== ""}
                <img class="legend" src={legendUrl} alt={$_("tools.layerManager.legend")} on:error={()=>{imageValid = false}} />
            {:else if !imageValid || legendUrl==""}
                <ErrorMessage message={$_("tools.layerManager.legendNotFoundText")} />
            {/if}
        {/if}
        {#if layer.config.opacitySupported}
            <div class="slider-wrapper">
                <Slider
                    hideTextInput
                    labelText={`${$_("tools.layerManager.opacity")} ` + $opacity + "%"}
                    min={0}
                    max={100}
                    bind:value={$opacity}
                />
            </div>
        {/if}
        <div class="button-wrapper">
            {#if $cameraPosition}
                <Button
                    kind="primary"
                    size="small"
                    iconDescription={$_("tools.layerManager.zoomToLayer")}
                    icon={Search}
                    tooltipPosition="bottom"
                    on:click={() => {
                        zoomToLayer();
                    }}
                />
            {/if}
            <Button
                kind="danger-tertiary"
                size="small"
                iconDescription={$_("tools.layerManager.delete")}
                icon={TrashCan}
                tooltipPosition="bottom"
                tooltipAlignment="end"
                on:click={() => {
                    removeLayer();
                }}
            />
        </div>
    </div>
</AccordionItem>

<style>
    .panel {
        overflow: visible;
        width: 100%;
        min-height: auto; 
        transition: height 0.3s ease-in-out;
    }

    .slider-wrapper {
        width: calc(100% - var(--cds-spacing-01));
        margin-top: var(--cds-spacing-05);
    }

    .slider-wrapper :global(.bx--slider-container) {
        width: 100%;
    }

    .slider-wrapper :global(.bx--slider) {
        min-width: 0;
        flex: 1 1 auto;
    }

    .legend {
        margin-top: var(--cds-spacing-02);
        max-width: 100%;
        background-color: var(--cds-ui-03);
    }

    .legend-header {
        margin-bottom: 5px;
    }

    .style-switcher {
        margin-bottom: var(--cds-spacing-05);
    }

    .item-header {
        display: flex;
        min-width: 95%;
        max-width: 95%;
        justify-content: left;
        align-items: center;
        overflow: hidden;
    }

    .layer-cb {
        flex-shrink: 1;
    }

    .layer-title-wrap {        
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
    }

    .layer-title {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        line-clamp: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        overflow-wrap: anywhere;
        word-break: break-word;
        min-width: 0;
        max-width: 100%;
    }

    .layer-title-open {
        -webkit-line-clamp: 2;
        line-clamp: 2;
    }

    :global(.layer-control .bx--accordion__heading) {
        align-items: center;
        padding: 0 var(--cds-spacing-02) 0 0;
    }

    :global(.layer-control .bx--accordion__title) {
        overflow: hidden;
    }

    :global(.layer-control .bx--accordion__heading) {
        padding: var(--cds-spacing-02) 0 0 0;
    }

    :global(.layer-control .bx--accordion__arrow) {
        margin: 0 var(--cds-spacing-02) 5px 0;
    }

    :global(.tool-content.s-XzGKRQKmR8Sm) {
        overflow: visible;
    }

    .button-wrapper {
        display: flex;
        justify-content: right;
        margin-top: var(--cds-spacing-05);
        gap: var(--cds-spacing-02);
    }

    .metadata-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 999px;
        padding: 2px;
        color: var(--cds-icon-primary, #161616);
        transition: color 0.15s ease, background-color 0.15s ease;
        cursor: pointer;
        outline: none;
    }

    .metadata-link:hover,
    .metadata-link:focus-visible {
        color: var(--cds-link-primary, #0f62fe);
        background-color: var(--cds-hover-ui, #e5e5e5);
    }
</style>
