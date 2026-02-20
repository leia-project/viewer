<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { IsochronesLayer } from "./isochrones-layer";
    import { slide } from "svelte/transition";
	import IsochronesLegendExplainer from "./IsochronesLegendExplainer.svelte";

    export let isochronesLayer: IsochronesLayer;

    const isochrones = isochronesLayer.isochrones;

    const value_min = 0;
    const value_max = isochronesLayer.totalPopulation;

    const zeroOrNegativeColor = "#2DA44E";
    const positiveValueColors = [
        "#FEEBE7",
        "#FCC6BB",
        "#FAA18F",
        "#F87C63",
        "#F54927",
        "#F4320B",
        "#C82909",
        "#9C2007",
        "#701705",
        "#440E03"
    ];
    const legendBackground = createContinuousGradient(zeroOrNegativeColor, positiveValueColors);

    function createContinuousGradient(zeroColor: string, colors: Array<string>): string {
        if (colors.length === 0) {
            return `linear-gradient(to right, ${zeroColor}, ${zeroColor})`;
        }

        const zeroBoundaryPercent = 5;

        if (colors.length === 1) {
            return `linear-gradient(to right, ${zeroColor} 0%, ${zeroColor} ${zeroBoundaryPercent}%, ${colors[0]} 100%)`;
        }

        const positiveStops = colors
            .map((color, index) => {
                const ratio = index / (colors.length - 1);
                const position = zeroBoundaryPercent + ratio * (100 - zeroBoundaryPercent);
                return `${color} ${position.toFixed(2)}%`;
            })
            .join(", ");

        return `linear-gradient(to right, ${zeroColor} 0%, ${zeroColor} ${zeroBoundaryPercent}%, ${positiveStops})`;
    }


</script>

{#if $isochrones.length > 0}
    <div transition:slide={{ duration: 500 }}>
        <div class="legend-title">
            {$_('tools.isochrones.legendTitle')}
        </div>
        <div class="legend-container">
            {#if $value_max === 0 }
                <div class="legend" style="background: {zeroOrNegativeColor};"></div>
            {:else}
                <div class="legend" style="background: {legendBackground};"></div>
            {/if}
            <div class="values">
                <div class="min-value">{value_min}</div>
                <div class="max-value">{$value_max}</div>
            </div>
        </div>
    </div>

    <IsochronesLegendExplainer />
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
        width: 100%;
        height: 15px;
        border: 1px var(--cds-border-strong) solid;

    }
</style>
