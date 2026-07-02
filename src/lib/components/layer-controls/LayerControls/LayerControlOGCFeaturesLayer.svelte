<script lang="ts">
    import { _ } from "svelte-i18n";
    import type { OgcStyleCondition } from "$lib/map-cesium/providers/ogc-features-provider";

    export let style: Array<OgcStyleCondition>;

    // Assume first style is the only one (for now)
    $: condition = style[0];
    $: stops = [...condition.stops].sort((a, b) => a.value - b.value);

    $: valueMin = stops[0].value;
    $: valueMax = stops[stops.length - 1].value;
    $: range = valueMax - valueMin || 1;

    // Build a multi-stop gradient (left = min, right = max) from every stop.
    $: gradient = `linear-gradient(to right, ${stops
        .map((stop) => {
            const position = ((stop.value - valueMin) / range) * 100;
            return `${stop.color} ${position}%`;
        })
        .join(", ")})`;

    // Translate known property names, fall back to the raw property key.
    $: title = $_(`tools.layerManager.legendProperties.${condition.property}`, {
        default: condition.property
    });
</script>

<div class="ogc-legend">
    <div class="legend-title">{title}</div>
    <div class="legend-body">
        <div class="legend-bar" style="--gradient: {gradient}"></div>
        <div class="legend-labels">
            {#each stops as stop}
                {@const position = ((stop.value - valueMin) / range) * 100}
                <div class="legend-label" style="--position: {position}%">
                    <span class="tick" />
                    <span class="value">{stop.value}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .ogc-legend {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .legend-title {
        font-size: 0.75rem;
        font-weight: 400;
        line-height: 1.33333;
        letter-spacing: 0.32px;
        color: var(--cds-text-secondary, #525252);
    }

    .legend-body {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        width: 100%;
        max-width: 16rem;
    }

    .legend-bar {
        position: relative;
        width: 100%;
        height: 0.875rem;
        border-radius: 0.4375rem;
        background: var(--gradient);
        box-shadow:
            inset 0 0 0 1px rgba(0, 0, 0, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.18);
    }

    .legend-labels {
        position: relative;
        width: 100%;
        height: 1.25rem;
    }

    .legend-label {
        position: absolute;
        left: var(--position);
        top: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.125rem;
        transform: translateX(-50%);
    }

    .tick {
        width: 1px;
        height: 0.375rem;
        background: var(--cds-border-subtle, #c6c6c6);
    }

    .value {
        font-size: 0.75rem;
        font-variant-numeric: tabular-nums;
        color: var(--cds-text-secondary, #525252);
    }
</style>