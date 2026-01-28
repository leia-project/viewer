<script lang="ts">
	import { _ } from "svelte-i18n";
    import { Slider } from "carbon-components-svelte";
	import type { IsochronesLayer } from "./isochrones-layer";


    export let isochronesLayer: IsochronesLayer;

    const value = isochronesLayer.totalPopulation;
    
</script>


<Slider 
    hideTextInput 
    labelText={`${$_('tools.isochrones.totalPopulation')}: ${$value}`}
    min={0}
    max={20000}
    step={1000}
    bind:value={$value}
/>


<style>

</style>