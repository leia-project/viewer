<script lang="ts">
    import { Slider } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;


    let fractionSmallestIsochrone: number = 0.5;
    // 50% van deze mensen vestigt zich binnen 20 minuten van het gekozen punt (slider controlled)

    // 30% van deze mensen vestigt zich binnen 40 minuten van het gekozen punt (derived)

    // 20% van deze mensen vestigt zich binnen 60 minuten van het gekozen punt (derived)

    $: {console.log("Fraction Smallest Isochrone:", fractionSmallestIsochrone);}

    onMount(() => {
        console.log("ControlIsochroneStyles mounted");

    });


    onDestroy(() => {
        console.log("ControlIsochroneStyles destroyed");

    });
</script>


<Slider labelText={`Fraction Smallest Isochrone: ${fractionSmallestIsochrone.toFixed(2)}`} hideTextInput min={0} max={1} step={0.01} bind:value={fractionSmallestIsochrone} />


<style>

</style>