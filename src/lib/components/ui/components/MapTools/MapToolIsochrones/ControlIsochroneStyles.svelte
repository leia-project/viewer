<script lang="ts">
    import * as Cesium from "cesium";
    import { Map } from "$lib/components/map-cesium/module/map";
    import { Slider } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";


    // TODO: rewrite isochrones to class with methods
    import type { Isochrone } from "./Isochrone";
    import { isochrones } from "./Isochrone";

    export let map: Map;

    let fractionSmallestIsochrone: number = 0.5;

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