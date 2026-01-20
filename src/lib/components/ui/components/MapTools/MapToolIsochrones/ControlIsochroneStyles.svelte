<script lang="ts">
    import { Slider } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;

    let fractionSmallestIsochrone: number = 0.5;
    $: remaining = 1 - fractionSmallestIsochrone;
    $: fractionMediumIsochrone = remaining * 0.6; // 30/(30+20) = 0.6 of the remaining
    $: fractionBiggestIsochrone = remaining * 0.4; // 20/(30+20) = 0.4 of the remaining

    // Update isochrone weights when fractions change
    $: {
        isochronesLayer.updateIsochroneWeight(1, fractionSmallestIsochrone);
        isochronesLayer.updateIsochroneWeight(2, fractionMediumIsochrone);
        isochronesLayer.updateIsochroneWeight(3, fractionBiggestIsochrone);
    }

    onMount(() => {
        console.log("ControlIsochroneStyles mounted");

    });


    onDestroy(() => {
        console.log("ControlIsochroneStyles destroyed");

    });
    
</script>


<Slider labelText={`Fraction 20 min Isochrone: ${fractionSmallestIsochrone.toFixed(2)}`} hideTextInput min={0} max={1} step={0.01} bind:value={fractionSmallestIsochrone} />

<Slider labelText={`Fraction 40 min Isochrone: ${fractionMediumIsochrone.toFixed(2)}`} hideTextInput min={0} max={1} step={0.01} value={fractionMediumIsochrone} disabled />

<Slider labelText={`Fraction 60 min Isochrone: ${fractionBiggestIsochrone.toFixed(2)}`} hideTextInput min={0} max={1} step={0.01} value={fractionBiggestIsochrone} disabled />


<style>

</style>