<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
    import { InlineLoading } from "carbon-components-svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;


    onMount(() => {
        isochronesLayer.show();
    });


    onDestroy(() => {
        isochronesLayer.destroyHandler();
        isochronesLayer.hide();
    });

    const coordinates = isochronesLayer.coordinates;
    const dataLoading = isochronesLayer.dataLoading;
    const handler = isochronesLayer.handler;

</script>

<div class="buttons-container">
    <div class=component>
        <Button
            kind={!$handler ? "tertiary" : "primary"}
            on:click={() => {
                !$handler ? isochronesLayer.drawPoint() : isochronesLayer.destroyHandler();
            }}
        >
            {#if !$handler}
                {$_('tools.isochrones.drawIsochroneCenter')}
            {:else}
                {$_('tools.isochrones.drawingIsochroneCenter')}
            {/if}
        </Button>
    </div>

    <div class=component>
        <Button
            kind="tertiary"
            disabled={!$coordinates || $dataLoading}
            on:click={async () => {
                await isochronesLayer.entityToIsochrones();

                // Wait for polygon entities array to be populated
                isochronesLayer.dataLayer.loaded?.then(async () => {
                    isochronesLayer.addDataValuesToIsochrones();
                });
            }}
        >
            {#if $dataLoading}
                <InlineLoading description={$_('tools.isochrones.calculating')} />
            {:else}
                {$_('tools.isochrones.calculate')}
            {/if}
        </Button>
    </div>
</div>


<style>
    :global(.component .bx--inline-loading) {
        min-height: 0;
    }

    .buttons-container :global(button) {
        width: 100%;
    }

    .component {
        margin-bottom: 10px;
    }
</style>