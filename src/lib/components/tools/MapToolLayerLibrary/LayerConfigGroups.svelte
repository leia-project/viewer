<script lang="ts">
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
    
	import type { LayerLibrary } from "$lib/map-core/layer-library";
    import LayerConfigGroup from "./LayerConfigGroup.svelte";

    export let library: LayerLibrary;
    export let textBaselayers: string = get(_)("tools.layerLibrary.baseLayers");
    export let textNoCategory: string = get(_)("tools.layerLibrary.noCategory");

    $: groups = library.groups;

</script>

<div class="group-wrapper">
    {#each $groups as group}
        {#if group.id !== "myData"}
            {#if (group.childGroups && get(group.childGroups).length > 0) || (group.layerConfigs && get(group.layerConfigs).length > 0)}
                <LayerConfigGroup {library} {group} {textBaselayers} {textNoCategory} ></LayerConfigGroup>
            {/if}
        {/if}
    {/each}
</div>

<style>
    .group-wrapper {
        display: flex;
        flex-direction: column;
    }
</style>
