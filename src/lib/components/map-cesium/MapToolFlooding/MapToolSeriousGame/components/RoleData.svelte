<script lang="ts">
    import type { Map } from "$lib/components/map-cesium/module/map";
	import { get } from "svelte/store";
    import type { IRole } from "../module/models";
    import { Checkbox } from "carbon-components-svelte";
    import HexagonLayerControl from "./LayerManager/HexagonLayerControl.svelte";
    import BaseLayer from "./LayerManager/BaseLayer.svelte";
	import type { GameController } from "../module/game-controller";

    export let roleData: IRole;
    export let mainLayerIds;
    export let gameController: GameController;

    const layers = gameController.map.layers;
    $: mainLayers = $layers.filter((l) => mainLayerIds.includes(l.id));
    $: roleLayers = $layers.filter((l) => roleData.layerIds.includes(l.id)); 

</script>

<section>
    <span><strong>{roleData.role}</strong></span>
    <br><br>
    <div>
        <span>Hexagon kaartlagen</span>
        <HexagonLayerControl layer={mainLayers[0]} {gameController}></HexagonLayerControl>
    </div>
    <br><br>
    <div>
        <span>Gedeelde kaartlagen</span>
        {#each mainLayers as mL}
            <BaseLayer layer={mL}></BaseLayer>
        {/each}
    </div>
    <br><br>
    <div>
        <span>Rol specifieke kaartlagen</span>
        {#each roleLayers as rL}
            <BaseLayer layer={rL}></BaseLayer>
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