<script lang="ts">
	import { _ } from "svelte-i18n";
    import { Slider } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;

    const isochrones = isochronesLayer.isochrones;
    
</script>


<Slider 
    hideTextInput 
    labelText={$_('tools.isochrones.totalPopulation')}
    min={0}
    max={20000}
    step={1000}
    value={10000}
/>


<style>

</style>