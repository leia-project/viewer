<script lang="ts">
    import { Slider } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;

    const isochrones = isochronesLayer.isochrones;


    onMount(() => {
        console.log("ControlIsochroneStyles mounted");

    });


    onDestroy(() => {
        console.log("ControlIsochroneStyles destroyed");

    });
    
</script>

<div class="sliders">
    {#each $isochrones as isochrone, i}
        <Slider 
            labelText={`Fraction ${isochrone.props.isochroneEnd} min Isochrone: ${isochrone.props.weight}`} 
            hideTextInput 
            min={0} 
            max={1} 
            step={0.01} 
            bind:value={isochrone.props.weight}
            disabled={isochrone.props.index !== 1}
        />
    {/each}
</div>


<style>
    .sliders {
        align-items: center;
        margin: 10px auto;
        padding: 10px;
        background-color: var(--cds-ui-01);
        border-radius: 5px;
        border: 1px solid var(--cds-ui-03);
	}

    .sliders:empty {
        display: none;
    }
</style>