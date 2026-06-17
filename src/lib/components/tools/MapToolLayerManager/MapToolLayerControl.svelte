<script lang="ts">
    import { getContext, onMount, afterUpdate } from "svelte";
    import { _ } from "svelte-i18n";
    import { Slider, Checkbox, Button, AccordionItem, Dropdown } from "carbon-components-svelte";
	import { Search, TrashCan, ChevronDown, ChevronUp } from "carbon-icons-svelte";
    import { XMLParser } from 'fast-xml-parser';

    import type { Layer } from "$lib/map-core/layer";
    import ErrorMessage from "$lib/components/theme/ErrorMessage/ErrorMessage.svelte"

    const { map } = getContext<any>("mapTools");

    export let layer: Layer;
    export let active: boolean = false;

    let open: boolean;
    let imageValid: boolean = true;
    let descriptionValid: boolean = true;
    let descriptionExpanded: boolean = false;
    let descriptionOverflows: boolean = false;
    let descriptionEl: HTMLParagraphElement | undefined;
    let items: { id: string; text: string }[] = [];
    
    const defaultLegendUrl = layer.config.legendUrl;
    const hasConfigLegendUrl = defaultLegendUrl !== undefined && defaultLegendUrl !== "";
    let legendUrl: string | undefined = undefined; // The actual URL used to render the legend image

    const visible = layer.visible;
    const opacity = layer.opacity;
    const customControls = layer.customControls;
    const cameraPosition = layer.config.cameraPositionStore;
    
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

    function checkDescriptionOverflow() {
        if (!descriptionEl) return;
        descriptionOverflows = descriptionEl.scrollHeight > descriptionEl.clientHeight + 1;
    }

    afterUpdate(() => {
        if (!descriptionExpanded) {
            checkDescriptionOverflow();
        }
    });

    onMount(async() => {
        if (layer.config.type !== "wms" || !layer.config.legendSupported) {
            return;
        }
        if (!layer.config.settings?.tools?.styleSwitcher?.enabled) {
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
                <p
                    class="description label-01"
                    class:description-clamped={!descriptionExpanded}
                    bind:this={descriptionEl}
                >{layer.config.description}</p>
                {#if descriptionOverflows || descriptionExpanded}
                    <button
                        type="button"
                        class="description-toggle label-01"
                        on:click|stopPropagation={() => (descriptionExpanded = !descriptionExpanded)}
                    >
                        <span>{descriptionExpanded ? $_("tools.layerManager.showLess") : $_("tools.layerManager.showMore")}</span>
                        <svelte:component this={descriptionExpanded ? ChevronUp : ChevronDown} size={16} />
                    </button>
                {/if}
            {/if}
        {/if}
        {#if layer.config.opacitySupported}
            <Slider
                hideTextInput
                labelText={`${$_("tools.layerManager.opacity")} ` + $opacity + "%"}
                min={0}
                max={100}
                bind:value={$opacity}
            />
        {/if}
        {#if layer.config.type === "wms" && layer.config.settings?.tools?.styleSwitcher?.enabled == true}        
            <Dropdown
                titleText={$_("tools.layerManager.wmsStyling")}
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
            {#if imageValid && legendUrl !== ""}
                <img class="legend" src={legendUrl} alt={$_("tools.layerManager.legend")} on:error={()=>{imageValid = false}} />
            {:else if !imageValid || legendUrl==""}
                <ErrorMessage message={$_("tools.layerManager.legendNotFoundText")} />
            {/if}
        {/if}
        <div class="button-wrapper">
            {#if $cameraPosition}
                <Button
                    kind="primary"
                    size="small"
                    iconDescription={$_("tools.layerManager.zoomToLayer")}
                    icon={Search}
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
        overflow-wrap: anywhere;
        word-break: break-word;
        white-space: pre-line;
    }

    .description-clamped {
        display: -webkit-box;
        -webkit-line-clamp: 5;
        line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .description-toggle {
        display: inline-flex;
        align-items: center;
        gap: var(--cds-spacing-01);
        margin-bottom: var(--cds-spacing-03);
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        color: var(--cds-link-01);
    }

    .description-toggle:hover {
        color: var(--cds-link-primary-hover, var(--cds-hover-primary-text));
        text-decoration: underline;
    }

    .description-toggle:focus-visible {
        outline: 2px solid var(--cds-focus);
        outline-offset: 2px;
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
</style>
