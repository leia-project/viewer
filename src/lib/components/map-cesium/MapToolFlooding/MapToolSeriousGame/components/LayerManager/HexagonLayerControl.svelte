<script lang="ts">
    import { Slider } from "carbon-components-svelte";
    import type { Layer } from "$lib/components/map-core/layer";
	import BaseLayer from "./BaseLayer.svelte";
	import { Checkbox } from "carbon-components-svelte";
	import type { HexagonLayer } from "../../module/game-elements/hexagons/hexagon-layer";

    export let layer: HexagonLayer;
    const use2DMode = layer?.use2DMode;
    const opacity = layer.alpha;

</script>

<BaseLayer {layer}>
    <Slider
        slot="Slider"
        bind:value={$opacity}
        labelText="Opacity"
        min={0}
        max={1}
        step={0.01}
    />
    <Checkbox slot = "2DMode"
        bind:checked={$use2DMode}
        labelText = "2D Mode"
    />
</BaseLayer>
