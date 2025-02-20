<script lang="ts">
    import type { OgcStyleCondition } from "../module/providers/ogc-features-provider";

    export let style: Array<OgcStyleCondition>;

    const colors: Array<String> = [];
    const values: Array<Number> = [];

    // Assume first style is the only one (for now)
    style[0].stops.map((stop) => {
        colors.push(stop.color);
        values.push(stop.value);
    });

    const color_min = colors[0];
    const color_max = colors[colors.length - 1];

    const value_min = values[0];
    const value_max = values[values.length - 1];
</script>

<div class="legend-title">
    {style[0].property}
</div>
<div class="legend-container">

    <div class="values">
        <div class="top-value">{value_max}</div>
        <div class="bottom-value">{value_min}</div>
    </div>
    <div class="legend" style="--color-min: {color_min}; --color-max: {color_max}"></div>
</div>


<style>
    .legend-title {
        font-size: 14px;
        margin-bottom: 4px;
        font-weight: bold;
    }

    .legend-container {
        display: flex;
        height: 80px;
    }
    
    .values {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        height: 100%;
    }

    .top-value {
        font-size: 14px;
        margin-right: 4px;
    }

    .bottom-value {
        font-size: 14px;
        margin-right: 4px;
    }

    .legend {
        background: linear-gradient(to bottom, var(--color-max), var(--color-min));
        width: 10%;
        height: 100%;
        border: 1px solid #000;

    }
</style>