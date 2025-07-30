<script lang="ts">
    import type { IRole } from "../../module/models";
    import BaseLayer from "./BaseLayer.svelte";
	import type { GameController } from "../../module/game-controller";

    export let roleData: IRole;
    export let mainLayerIds;
    export let gameController: GameController;

    const layers = gameController.map.layers;
    $: mainLayers = $layers.filter((l) => mainLayerIds.includes(l.id));
    $: roleLayers = $layers.filter((l) => roleData.layerIds.includes(l.id)); 
    const activeGame = gameController.active;

</script>

<section class="role-data">
    <span><strong>{roleData.role}</strong></span>
    <div>
        <span>Achtergrondlagen</span>
        {#each mainLayers as mL}
            <BaseLayer layer={mL}></BaseLayer>
        {/each}
    </div>
    {#if roleLayers.length > 0}
        <div>
            <span>Rol specifieke kaartlagen</span>
            {#each roleLayers as rL}
                <BaseLayer layer={rL}></BaseLayer>
            {/each}
        </div>
    {/if}
</section>

<style>
   
    .role-data {
        font-size: 1.5em;
    }
</style>