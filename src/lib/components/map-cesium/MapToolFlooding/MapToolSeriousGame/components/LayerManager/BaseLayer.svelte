<script lang="ts">
	import type { Layer } from "$lib/components/map-core/layer";
    import { Checkbox } from "carbon-components-svelte";
	import type { HexagonLayer } from "../../module/game-elements/hexagons/hexagon-layer";
    export let layer: Layer | HexagonLayer ;

    const visible = layer?.visible;
</script>

<div>
    <Checkbox
        bind:checked={$visible}
        labelText = {layer.title}
    />
</div>
<slot name = "Slider"/>
<slot name = "2DMode"/>