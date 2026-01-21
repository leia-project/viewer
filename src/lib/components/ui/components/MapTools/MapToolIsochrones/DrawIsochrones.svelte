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
    const handler = isochronesLayer.handler;

</script>

<div class="buttons-container">
    <div class=component>
        <Button
            kind={!$handler ? "tertiary" : "primary"}
            on:click={() => {
                console.log("Draw Isochrone Center clicked")
                !$handler ? isochronesLayer.drawPoint() : isochronesLayer.destroyHandler();
            }}
        >
            {#if !$handler}
                Draw Isochrone Center
            {:else}
                Drawing Isochrone Center
            {/if}
        </Button>
    </div>

    <div class=component>
        <PasswordInput
            labelText="API Key"
            bind:value={$apiKey}
            placeholder="Enter GeodanMaps API key here..."
        />
    </div>


    <div class=component>
        <Button
            kind="tertiary"
            disabled={!$coordinates || !$apiKey || $dataLoading}
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
    </div>
</div>


<style>
    .buttons-container :global(button) {
        width: 100%;
    }

    .component {
        margin-bottom: 10px;
    }
</style>