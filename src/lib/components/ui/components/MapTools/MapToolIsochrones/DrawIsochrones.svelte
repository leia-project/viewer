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

    const coordinates = isochronesLayer.coordinates;
    const apiKey = isochronesLayer.apiKey;
    const dataLoading = isochronesLayer.dataLoading;

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
    bind:value={$apiKey}
    placeholder="Enter GeodanMaps API key here..."
/>


<Button
    kind="tertiary"
    disabled={!$coordinates || !$apiKey}
    on:click={() => {
        console.log("Calculate Isochrones clicked");
        isochronesLayer.entityToIsochrones();
    }}
>
    {#if $dataLoading}
        <InlineLoading description="Calculating..." />
    {:else}
        Calculate isochrones
    {/if}
</Button>


<style>

</style>