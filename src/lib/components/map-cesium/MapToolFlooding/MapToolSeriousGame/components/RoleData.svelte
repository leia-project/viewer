<script lang="ts">
    import type { IRole } from "../module/models";
    import HexagonLayerControl from "./LayerManager/HexagonLayerControl.svelte";
    import BaseLayer from "./LayerManager/BaseLayer.svelte";
	import type { GameController } from "../module/game-controller";

    export let roleData: IRole;
    export let mainLayerIds;
    export let gameController: GameController;

    const layers = gameController.map.layers;
    $: mainLayers = $layers.filter((l) => mainLayerIds.includes(l.id));
    $: roleLayers = $layers.filter((l) => roleData.layerIds.includes(l.id)); 
    const activeGame = gameController.active;

</script>

<section>
    <span><strong>{roleData.role}</strong></span>
    <br><br>
    <div>
        <span>Hexagon kaartlagen</span>
        {#if $activeGame}
            <HexagonLayerControl layer={$activeGame?.evacuationController.hexagonLayer}></HexagonLayerControl>
        {/if}
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