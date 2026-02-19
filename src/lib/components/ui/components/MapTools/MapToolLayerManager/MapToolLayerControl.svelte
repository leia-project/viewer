<script lang="ts">
    import { getContext } from "svelte";
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

    $: visible = layer.visible;
    $: opacity = layer.opacity;
    $: customControls = layer.customControls;
    $: textOpacity = `${$_("tools.layerManager.opacity")} ` + $opacity + "%";
    
    async function getWMSStyleNames(getCapabilitiesUrl: string) {
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
                isArray: (tagName, jPath, isLeafNode, isAttribute) => {
                if (tagName === 'Style') return true;
                return false;
                }
            });
            const parsedXml = parser.parse(xmlText);

            let styleNames = [];

    //         if (
    //             parsedXml &&
    //             parsedXml.WMS_Capabilities &&
    //             parsedXml.WMS_Capabilities.Capability &&
    //             parsedXml.WMS_Capabilities.Capability.Layer &&
    //             Array.isArray(parsedXml.WMS_Capabilities.Capability.Layer)
    //         ) {
    //             // Iterate through each Layer object in the WMS capabilities
    //             parsedXml.WMS_Capabilities.Capability.Layer.forEach(layer => {
                        
    //                 if (layer.Layer && Array.isArray(layer.Layer)) {
    //                 layer.Layer.forEach(subLayer => {
    //                 if (subLayer.Style) {
    //                     if (Array.isArray(subLayer.Style)) {
    //                     subLayer.Style.forEach(style => {
    //                         styleNames.push({ id: style.Name, text: style.Title ? style.Title : style.Name });
    //                     });
    //                     } else {
    //                     styleNames.push({ id: subLayer.Style.Name, text: subLayer.Style.Title ? subLayer.Style.Title : subLayer.Style.Name });
    //                     }
    //                 }
    //                 })
    //             } else {
    //                 if (layer.Style) {
    //                 if (Array.isArray(layer.Style)) {
    //                     layer.Style.forEach(style => {
    //                     styleNames.push({ id: style.Name, text: style.Title ? style.Title : style.Name });
    //                     });
    //                 } else {
    //                     styleNames.push({ id: layer.Style.Name, text: layer.Style.Title ? layer.Style.Title : layer.Style.Name });
    //                 }
    //                 }
    //             }
    //             })
    //         }
    //         else if (
    //             parsedXml &&
    //             parsedXml.WMS_Capabilities &&
    //             parsedXml.WMS_Capabilities.Capability &&
    //             parsedXml.WMS_Capabilities.Capability.Layer &&
    //             parsedXml.WMS_Capabilities.Capability.Layer.Style
    //         ) {
    //             const styles = parsedXml.WMS_Capabilities.Capability.Layer.Style;
    //         }

            return parsedXml

        } catch (error) {
            console.error("Error fetching WMS GetCapabilities:", error);
            return [];
        }
    };

    $: styles = getWMSStyleNames("https://service.pdok.nl/cbs/wijkenbuurten/2024/wms/v1_0?service=WMS&request=GetCapabilities");
    $: console.log("styles", styles);

    const items = [
        { id: "0", text: "wijkenbuurten_thema_buurten_gemeentewijkbuurt_omgevingsadressendichtheid_adres_km2" },
        { id: "1", text: "BB" },
        { id: "2", text: "CC" },
        { id: "3", text: "DD" },
        { id: "4", text: "EE" },
        { id: "5", text: "FF" },
        { id: "6", text: "GG" },
        { id: "7", text: "HH" },
        { id: "8", text: "II" },
        { id: "9", text: "JJ" },
        { id: "10", text: "KK" },
        // { id: "11", text: "LL" },
        // { id: "12", text: "MM" },
        // { id: "13", text: "NN" },
        // { id: "14", text: "OO" },
        // { id: "15", text: "PP" },
    ];
    
    function removeLayer() {
        layer.remove();
    }

    function zoomToLayer() {
        const pos = layer.getLayerPosition();
        map.flyTo(pos);
    }
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
        {#if layer.config.type === "wms"}
            <Dropdown
                titleText="WMS Styling options"
                size="sm"
                selectedId="0" 
                items={items}
                on:select={(e) => {
                    console.log("Selected item:", e.detail);
                }}
            />
        {/if}
        {#if layer.config.legendSupported}
            <div class="label-01 legend-header">
                {$_("tools.layerManager.legend")}
            </div>
            {#if imageValid}
                <img class="legend" src={layer.config.legendUrl} alt="legend" on:error="{()=>{imageValid = false}}" />
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
