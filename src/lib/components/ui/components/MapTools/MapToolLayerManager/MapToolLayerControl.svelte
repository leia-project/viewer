<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { _ } from "svelte-i18n";

    import { XMLParser } from 'fast-xml-parser';
    import { Slider, Checkbox, Button, AccordionItem, Dropdown } from "carbon-components-svelte";
    import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
    import Search from "carbon-icons-svelte/lib/Search.svelte";
    import ErrorMessage from "$lib/components/ui/components/ErrorMessage/ErrorMessage.svelte"

    import type { Layer } from "$lib/components/map-core/layer";

    const { map } = getContext<any>("mapTools");

    export let layer: Layer;
    export let active: boolean = false;
    export let textOpacity: string;
    //export let textInfo: string = "Info";

    let open: boolean;
    let imageValid: boolean = true;
    let descriptionValid: boolean = true;
    let items: { id: string; text: string }[] = [];
    
    const defaultLegendUrl = layer.config.legendUrl;
    let legendUrl: string | undefined = undefined; // The actual URL used to render the legend image

    $: visible = layer.visible;
    $: opacity = layer.opacity;
    $: customControls = layer.customControls;
    $: textOpacity = `${$_("tools.layerManager.opacity")} ` + $opacity + "%";
    
    async function getWMSStyleNames(getCapabilitiesUrl: string, featureName: string) {
        try {
            const response = await fetch(getCapabilitiesUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const xmlText = await response.text();
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '',
                textNodeName: '#text',
                trimValues: true,
                parseTagValue: true,
                parseAttributeValue: true,
                isArray: (tagName) => {
                    if (tagName === 'Style') return true;
                    return false;
                }
            });

            const parsedXml = parser.parse(xmlText);

            const styleNames: { id: string; text: string, legendURL: string | undefined }[] = [];
            if (parsedXml) {
                const layerData = parsedXml.WMS_Capabilities.Capability.Layer.Layer;
                const layers = Array.isArray(layerData) ? layerData : [layerData];

                const hasConfigLegendUrl = defaultLegendUrl !== undefined && defaultLegendUrl !== "";

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
        map.flyTo(pos);
    }

    onMount(async() => {
        if (layer.config.type !== "wms") {
            return;
        }
        if (layer.config.settings?.tools?.styleSwitcher?.enabled === false) {
            // If style switcher is disabled, use the config legend URL
            legendUrl = defaultLegendUrl;
        }
        else {
            const WMSUrl = layer.config.settings?.url + "?service=WMS&request=GetCapabilities";
            const featureName = layer.config.settings?.featureName;
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
                <div class="label-01" class:layer-title-condensed={open === false} title={layer.title}>
                    {layer.title}
                </div>
            </div>
        </div>
    </svelte:fragment>

    <div class="panel" class:panel-active={active}>
        {#if $customControls}
            {#each $customControls as control}
                <svelte:component this={control.component} {...control.props} />
            {/each}
        {/if}
        {#if layer.config.descriptionSupported}
            <div class="label-01 description-header">
                {$_("description")}
            </div>
            {#if descriptionValid && layer.config.description}
                <p class="description">{layer.config.description}</p>
            <!-- {#if !descriptionValid}
                <ErrorMessage message="{$_("tools.layerManager.legendNotFoundText")}" />
            {/if} -->
            {/if}
        {/if}
        {#if layer.config.opacitySupported}
            <Slider hideTextInput labelText={textOpacity} min={0} max={100} bind:value={$opacity} />
        {/if}
        {#if layer.config.type === "wms" && layer.config.settings?.tools?.styleSwitcher?.enabled == true}        
            <Dropdown
                titleText="WMS Styling options"
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
        {/if}
        {#if layer.config.legendSupported}
            <div class="label-01 legend-header">
                {$_("tools.layerManager.legend")}
            </div>
            {#if imageValid}
                <img class="legend" src={legendUrl} alt="legend" on:error={()=>{imageValid = false}} />
            {/if}
            {#if !imageValid}
                <ErrorMessage message="{$_("tools.layerManager.legendNotFoundText")}" />
            {/if}
        {/if}
        <div class="button-wrapper">
            {#if layer.getLayerPosition()}
                <Button
                    kind="primary"
                    size="small"
                    iconDescription="Zoom to layer"
                    icon={Search}
                    on:click={() => {
                        zoomToLayer();
                    }}
                />
            {/if}
            <Button
                kind="danger-tertiary"
                size="small"
                iconDescription="Delete"
                icon={TrashCan}
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

    .description {
        margin-top: var(--cds-spacing-01);
        max-width: 100%;
        margin-bottom: var(--cds-spacing-02);
    }

    .description-header {
        margin-bottom: 5px;
    }

    .legend {
        margin-top: var(--cds-spacing-02);
        max-width: 100%;
        background-color: var(--cds-ui-03);
    }

    .legend-header {
        margin-bottom: 5px;
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
    }

    .layer-title-condensed {
        max-width: 15rem;
        white-space: nowrap;
        display: inline-block;
        overflow: hidden !important;
        text-overflow: ellipsis;
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
</style>
