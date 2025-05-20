<script lang="ts">
    import type { Map } from "$lib/components/map-cesium/module/map";
	import type { Layer } from "$lib/components/map-core/layer";
	import { get } from "svelte/store";
    import type { IRole } from "../module/models";
    import { Checkbox } from "carbon-components-svelte";

    export let roleData: IRole;
    export let mainLayerIds;
    export let map: Map;

    const layers = map.layers;
    $: mainLayers = $layers.filter((l) => mainLayerIds.includes(l.id));
    $: roleLayers = $layers.filter((l) => roleData.layerIds.includes(l.id)); 

</script>

<section>
    <span><strong>{roleData.role}</strong></span>
    <br><br>
    <div>
        <span>Gedeelde kaartlagen</span>
        {#each mainLayers as mL}
            <div>
                <Checkbox
                    checked={get(mL.visible)}
                    on:change={() => mL.visible.set(!get(mL.visible))}
                    labelText = {mL.title}
                />
            </div>
        {/each}
    </div>
    <br><br>
    <div>
        <span>Rol specifieke kaartlagen</span>
        {#each roleLayers as rL}
            <div>
                <Checkbox
                    checked={get(rL.visible)}
                    on:change={() => rL.visible.set(!get(rL.visible))}
                    labelText = {rL.title}
                />
            </div>
        {/each}
    </div>
</section>

<style>
    section {
        width: 500%;
        padding: 5%;
        background-color: white;
        border-radius: 10px;
    }

    span {
        font-size: 1.5em;
    }
</style>