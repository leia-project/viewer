<script lang="ts">
	import { _ } from "svelte-i18n";
    import * as Cesium from "cesium";
	import type { IsochronesLayer } from "./isochrones-layer";
    import { slide } from "svelte/transition";

    export let isochronesLayer: IsochronesLayer;

    const isochrones = isochronesLayer.isochrones;

    const value_min = 0;
    const value_max = isochronesLayer.totalPopulation;

    // Create gradient with multiple stops: green -> yellow -> orange -> red
    const color_0 = weightToColorString(0);     // green
    const color_33 = weightToColorString(0.33); // yellow
    const color_66 = weightToColorString(0.66); // orange
    const color_100 = weightToColorString(1);   // red

    function weightToColorString(weight: number): string {
        const color = Cesium.Color.fromHsl(
            ((1 - weight) * 120) / 360,  // Hue: 0 degrees (red) at weight=1, 120 degrees (green) at weight=0
            1.0,                         // Saturation
            0.5,                         // Lightness
            1.0                          // Alpha (removed transparency for better visibility)
        );
        return color.toCssHexString();
    }


</script>

{#if $isochrones.length > 0}
    <div transition:slide={{ duration: 500 }}>
        <div class="legend-title">
            {$_('tools.isochrones.legendTitle')}
        </div>
        <div class="legend-container">
            {#if $value_max === 0 }
                <div class="legend" style="background: #808080;"></div>
            {:else}
                <div class="legend" style="--color-0: {color_0}; --color-33: {color_33}; --color-66: {color_66}; --color-100: {color_100}"></div>
            {/if}
            <div class="values">
                <div class="min-value">{value_min}</div>
                <div class="max-value">{$value_max}</div>
            </div>
        </div>
    </div>
{/if}

<style>
    .legend-title {
        font-size: 14px;
        margin-bottom: 4px;
        font-weight: bold;
    }

    .legend-container {
        display: flex;
        flex-direction: column;
    }
    
    .values {
        display: flex;
        justify-content: space-between;
        flex-direction: row;
        height: 100%;
        margin-top: 4px;
    }

    .max-value {
        font-size: auto;
    }

    .min-value {
        font-size: auto;
    }

    .legend {
        background: linear-gradient(to left, 
            var(--color-100), 
            var(--color-66) 33%, 
            var(--color-33) 66%, 
            var(--color-0)
        );
        width: 100%;
        height: 15px;
        border: 1px var(--cds-border-strong) solid;

    }
</style>
