<script lang="ts">
    import LayerManagerGroupView from "./LayerManagerGroup.svelte";
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
    
	import type { LayerLibrary } from "$lib/components/map-core/layer-library";
    import type { LayerManagerGroup } from "$lib/components/map-core/layer-manager-group";

    export let library: LayerLibrary;
    export let groups: Array<LayerManagerGroup>;
    export let textBaselayers: string = get(_)("tools.layerLibrary.baseLayers");
    export let textNoCategory: string = get(_)("tools.layerLibrary.noCategory");


</script>

<div class="group-wrapper">
    {#each groups as group}
        {#if group.id !== "myData"}
            <LayerManagerGroupView {library} {group} {textBaselayers} {textNoCategory} ></LayerManagerGroupView>
        {/if}
    {/each}
</div>

<style>
    .group-wrapper {
        display: flex;
        flex-direction: column;
    }
</style>
