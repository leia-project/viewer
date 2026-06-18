<script lang="ts">
    import { _ } from "svelte-i18n";    
	import type { LayerLibrary } from "$lib/map-core/layer-library";
    import type { LayerManagerGroup } from "$lib/map-core/layer-manager-group";
    import LayerManagerGroupView from "./LayerManagerGroup.svelte";

    export let library: LayerLibrary;
    export let groups: Array<LayerManagerGroup>;

</script>

<div class="group-wrapper">
    {#each groups as group}
        {#if group.id !== "myData"}
            <LayerManagerGroupView {library} {group} />
        {/if}
    {/each}
</div>

<style>
    .group-wrapper {
        display: flex;
        flex-direction: column;
    }
</style>
