<script lang="ts">
    import * as Cesium from "cesium";

    const value_min = 0;
    const value_max = 10000; // Max people

    // Create gradient with multiple stops: green -> yellow -> orange -> red
    const color_0 = weightToColorString(0);    // green
    const color_33 = weightToColorString(0.33); // yellow
    const color_66 = weightToColorString(0.66); // orange
    const color_100 = weightToColorString(1);   // red

    function weightToColorString(weight: number): string {
        const color = Cesium.Color.fromHsl(
            ((1 - weight) * 120) / 360, // Hue: 0 degrees (red) at weight=1, 120 degrees (green) at weight=0
            1.0,                         // Saturation
            0.5,                         // Lightness
            1.0                          // Alpha (removed transparency for better visibility)
        );
        return color.toCssHexString();
    }


</script>

<div class="legend-title">
    Legend
</div>
<div class="legend-container">
    <div class="values">
        <div class="top-value">{value_max}</div>
        <div class="bottom-value">{value_min}</div>
    </div>
    <div class="legend" style="--color-0: {color_0}; --color-33: {color_33}; --color-66: {color_66}; --color-100: {color_100}"></div>
</div>


<style>
    .legend-title {
        font-size: 14px;
        margin-bottom: 4px;
        font-weight: bold;
    }

    .legend-container {
        display: flex;
        height: 100px;
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
        background: linear-gradient(to bottom, 
            var(--color-100), 
            var(--color-66) 33%, 
            var(--color-33) 66%, 
            var(--color-0)
        );
        width: 10%;
        height: 100%;
        border: 1px var(--cds-border-strong) solid;

    }
</style>
