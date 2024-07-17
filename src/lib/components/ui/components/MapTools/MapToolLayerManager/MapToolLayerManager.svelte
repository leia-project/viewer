<script lang="ts">
    import { getContext } from "svelte";
    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";
    import LayerManagerGroups from "$lib/components/ui/components/MapTools/MapToolLayerManager/LayerManagerGroups.svelte";

    import Layers from "carbon-icons-svelte/lib/Layers.svelte";
    import { RadioButtonGroup, RadioButton, Accordion } from "carbon-components-svelte";    
    import { writable, get } from "svelte/store";

    import LayerControl from "./MapToolLayerControl.svelte";

    import type { Layer } from "$lib/components/map-core/layer";
    import { LayerManagerGroup } from "$lib/components/map-core/layer-manager-group"
	import type { LayerLibrary } from "$lib/components/map-core/layer-library";
	import { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";
    const { registerTool, selectedTool, map } = getContext<any>("mapTools");

    let id: string = "layermanager";
    export let icon: any = Layers;
    export let label: string = "Layermanager";
    export let layers: Array<Layer>;
    export let library: LayerLibrary;
    export let textBaselayers: string = "Baselayers";
    export let textThematicLayers: string = "Thematic layers";
    let textMyLayers: string = "My layers";
    let textDragDroppedLayers: string = "Drag and dropped layers";
    export let textOpacity: string = "Opacity:";
    export let textLegend: string = "Legend";

    // register this tool
    let tool = new MapToolMenuOption(id, icon, label);
    $: { tool.label.set(label); }
    registerTool(tool);

    // initialize background switching
    let selectedBackgroundLayer = writable<string>();
    selectedBackgroundLayer.subscribe((id) => {
        if(id) {
            switchBackground(id);
        }
    });

    $: libraryGroups = library.groups;
    $: groupsWithLayers = getGroupsWithLayers();

    // set the groups array, derived from the layers present in the layer manager
    let groups = Array<LayerManagerGroup>();
    $: {
        groups = []
        if (layers.length > 0) {
            groups = buildGroupsRecursive($libraryGroups);
        }
    }

    $: for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (
            layer.config.isBackground === true &&
            layer.config.defaultOn === true &&
            get(layer.visible) === true
        ) {
            selectedBackgroundLayer.set(layer.id);
        }
    } 

    function getGroupsWithLayers() {
        let groupIds: Array<number|string> = [];
        // get group ids from present layers
        for (let i = 0; i < layers.length; i++) {
            if (!groupIds.includes(layers[i].config.groupId)) {
                groupIds.push(layers[i].config.groupId);
            }
        }
        return groupIds
    }

    function buildGroupsRecursive(layerConfigGroups: Array<LayerConfigGroup>) {
        let groups = Array<LayerManagerGroup>();
        // filter library groups based on the groupIds
        let libraryGroupsFiltered = layerConfigGroups.filter(g => groupsWithLayers.includes(g.id))
        // copy library groups to layer groups
        for (let i = 0; i < libraryGroupsFiltered.length; i++) {
            let group = libraryGroupsFiltered[i];
            let layerManagerGroup = new LayerManagerGroup(group.id, group.title);
            // add layers belonging to this group to the layer manager group
            let layersFiltered = layers.filter(l => l.parentGroup == group.id)
            for (let i = 0; i < layersFiltered.length; i++) {
                let layer = layersFiltered[i];
                layerManagerGroup.addLayer(layer)
            }
            // add childgroups
            let childConfigGroups = get(group.childGroups).filter(g => groupsWithLayers.includes(g.id))
            let childLayerGroups = buildGroupsRecursive(childConfigGroups)
            for (let i = 0; i < childLayerGroups.length; i++) {
                let childLayerGroup = childLayerGroups[i];
                layerManagerGroup.addGroup(childLayerGroup)
            }
            groups.push(layerManagerGroup);
        }
        return groups
    }

    function switchBackground(id: string) {
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (layer.config.isBackground === true) {
                layer.visible.set(layer.id === id);
            }
        }
    }

    $: customLayersAdded = layers.map((layer) => layer.config.groupId).includes("myData");
    $: layersWithoutGroup = layers.filter((layer) => layer.config.groupId === undefined || layer.config.groupId === "");
    $: dragDroppedFiles = layers.filter((layer) => layer.config.settings?.dragDropped ?? false);

</script>

{#if $selectedTool === tool}
    <div class="wrapper">

        <RadioButtonGroup legendText={textBaselayers} selected="standard" orientation="vertical">
            {#each layers as layer}
                {#if layer.config.isBackground}
                    <RadioButton
                        labelText={layer.title}
                        value={layer.id}
                        checked={$selectedBackgroundLayer === layer.id}                      
                        on:change={() => { selectedBackgroundLayer.set(layer.id)}}
                    />
                {/if}
            {/each}
        </RadioButtonGroup>

        <slot name="backgroundControls" />

		<div class="bx--label thematic-label">
			{textThematicLayers}
		</div>
        <LayerManagerGroups {library} {groups} />

        {#if layersWithoutGroup.length}
            <Accordion class="layer-group-accordion" >
                {#each layersWithoutGroup as layer}
                    {#if !layer.config.isBackground && (layer.config.groupId === undefined || layer.config.groupId === "")}
                        <LayerControl {layer} {textOpacity} {textLegend} />
                    {/if}
                {/each}
            </Accordion>
        {/if}

        {#if customLayersAdded}
            <div class="bx--label thematic-label">
                {textMyLayers}
            </div>
            <Accordion class="layer-group-accordion" >
                {#each layers as layer}
                    {#if !layer.config.isBackground && layer.config.groupId === "myData"}
                        <LayerControl {layer} {textOpacity} {textLegend} />
                    {/if}
                {/each}
            </Accordion>
        {/if}

        {#if dragDroppedFiles.length }
            <div class="bx--label thematic-label">
                {textDragDroppedLayers}
            </div>
            <Accordion class="layer-group-accordion" >
                {#each layers as layer}
                    {#if layer.config.settings?.dragDropped}
                        <LayerControl {layer} {textOpacity} {textLegend} />
                    {/if}
                {/each}
            </Accordion>
        {/if}
    </div>
{/if}

<style>
    .wrapper {
        margin-top: var(--cds-spacing-05);
		margin-left: var(--cds-spacing-05);
		box-sizing: border-box;
    }

	.thematic-label {
		margin-top: var(--cds-spacing-05);
	}

    :global(.layer-group-accordion) {
        width: 100%;
    }
</style>
