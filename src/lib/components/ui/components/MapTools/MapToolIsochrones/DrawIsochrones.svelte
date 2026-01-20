<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
    import { PasswordInput } from "carbon-components-svelte";
    import { InlineLoading } from "carbon-components-svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;


    onMount(() => {
        console.log("DrawIsochroneCenter mounted");
        isochronesLayer.addIsochrones();
        isochronesLayer.addPointEntity();
    });


    onDestroy(() => {
        console.log("DrawIsochroneCenter destroyed");
        isochronesLayer.destroyHandler();
        isochronesLayer.removeIsochrones();
        isochronesLayer.removePointEntity();
    });

</script>


<Button
    kind={"tertiary"}
    on:click={() => {
        console.log("Draw Isochrone Center clicked")
        isochronesLayer.drawPoint();
        }}
    >
    Draw Isochrone Center
</Button>


<PasswordInput
    labelText="API Key"
    bind:value={isochronesLayer.apiKey}
    placeholder="Enter GeodanMaps API key here..."
/>


<Button
    kind="tertiary"
    disabled={!isochronesLayer.pointEntity || !isochronesLayer.apiKey}
    on:click={() => {
        console.log("Calculate Isochrones clicked");
        isochronesLayer.entityToIsochrones();
    }}
>
    {#if isochronesLayer.dataLoading}
        <InlineLoading description="Calculating..." />
    {:else}
        Calculate isochrones
    {/if}
</Button>


<style>

</style>