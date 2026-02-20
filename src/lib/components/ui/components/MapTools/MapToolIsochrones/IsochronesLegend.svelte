<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { IsochronesLayer } from "./isochrones-layer";
    import { slide } from "svelte/transition";
	import IsochronesLegendExplainer from "./IsochronesLegendExplainer.svelte";

    export let isochronesLayer: IsochronesLayer;

    const isochrones = isochronesLayer.isochrones;

    const value_min = 0;
    const value_max = isochronesLayer.totalPopulation;
    const zeroBoundaryPercent = 10;

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
    const legendBackground = createContinuousGradient(positiveValueColors);

    function createContinuousGradient(colors: Array<string>): string {
        if (colors.length === 0) {
            return "linear-gradient(to right, transparent, transparent)";
        }

        const positiveStops = colors
            .map((color, index) => {
                const ratio = index / (colors.length - 1);
                const position = ratio * 100;
                return `${color} ${position.toFixed(2)}%`;
            })
            .join(", ");

        return `linear-gradient(to right, ${positiveStops})`;
    }

    function unaccountedToLegendPosition(unaccountedPopulation: number, maxPopulation: number): number {
        if (maxPopulation <= 0) {
            return 0;
        }

        const clampedValue = Math.max(0, Math.min(unaccountedPopulation, maxPopulation));
        return (clampedValue / maxPopulation) * 100;
    }


</script>

{#if $isochrones.length > 0}
    <div transition:slide={{ duration: 500 }}>
        <div class="legend-title">
            {$_('tools.isochrones.legendTitle')}
        </div>
        <div class="legend-container">
            <div class="legend-track">
                <div class="legend" style="background: {legendBackground};"></div>
                <div class="legend-markers">
                    {#each $isochrones as isochrone}
                        <div
                            class="legend-marker"
                            style="--marker-left: {unaccountedToLegendPosition(isochrone.props.unaccountedPopulation, $value_max)}%;"
                        ></div>
                    {/each}
                </div>
            </div>
            <div class="values">
                <div class="min-value">{value_min}</div>
                <div class="max-value">{$value_max}</div>
            </div>

            <div class="no-pressure">
                <div class="legend-title no-pressure-heading">Geen druk</div>
                <div class="no-pressure-box" style="width: {zeroBoundaryPercent}%; background: {zeroOrNegativeColor};"></div>
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

    .legend-track {
        position: relative;
        height: 15px;
        overflow: visible;
    }

    .legend-markers {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: visible;
    }

    .legend-marker {
        position: absolute;
        top: -2px;
        left: min(var(--marker-left), calc(100% - 1px));
        width: 0;
        height: 19px;
        border-left: 1px solid var(--cds-text-primary);
        box-sizing: border-box;
        transition: left 250ms ease;
    }

    .no-pressure {
        margin-top: 6px;
        margin-bottom: 6px;
    }

    .no-pressure-heading {
        margin-top: 0;
    }

    .no-pressure-box {
        height: 15px;
        border: 1px var(--cds-border-strong) solid;
    }
</style>
