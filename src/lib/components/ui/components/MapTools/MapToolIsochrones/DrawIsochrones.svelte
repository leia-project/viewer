<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
    import { PasswordInput } from "carbon-components-svelte";
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
    const apiKey = isochronesLayer.apiKey;
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
        <PasswordInput
            labelText={$_('tools.isochrones.apiKey')}
            bind:value={$apiKey}
            placeholder={$_('tools.isochrones.enterApiKey')}
        />
    </div>


    <div class=component>
        <Button
            kind="tertiary"
            disabled={!$coordinates || !$apiKey || $dataLoading}
            on:click={() => {
                isochronesLayer.entityToIsochrones();
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
    .buttons-container :global(button) {
        width: 100%;
    }

    .component {
        margin-bottom: 10px;
    }
</style>