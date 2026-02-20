<script lang="ts">
	import { _ } from "svelte-i18n";
    import { Slider } from "carbon-components-svelte";
	import type { IsochronesLayer } from "./isochrones-layer";
	import { slide } from "svelte/transition";


    export let isochronesLayer: IsochronesLayer;

    const isochrones = isochronesLayer.isochrones;

    
</script>

<div class="sliders">
    {#each $isochrones as isochrone, i}
        <div transition:slide={{ duration: 500 }}>
            <Slider 
                labelText={`${$_('tools.isochrones.settlementPercentage')} (${Math.round(isochrone.props.isochroneEnd / 60)} min): ${Math.round(isochrone.props.weight * 100)}%`} 
                hideTextInput 
                min={0} 
                minLabel="0%"
                max={1}
                maxLabel="100%"
                step={0.01} 
                bind:value={isochrone.props.weight}
                disabled={isochrone.props.index !== 1}
            />
        </div>
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