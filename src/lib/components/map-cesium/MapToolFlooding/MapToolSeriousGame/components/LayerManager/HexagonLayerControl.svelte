<script lang="ts">
    import { Slider } from "carbon-components-svelte";
    import type { Layer } from "$lib/components/map-core/layer";
	import BaseLayer from "./BaseLayer.svelte";
	import { Checkbox } from "carbon-components-svelte";
	import type { HexagonLayer } from "../../module/game-elements/hexagons/hexagon-layer";
	import type { GameController } from "../../module/game-controller";
	import { get } from "svelte/store";

    export let layer: Layer;
    export let gameController: GameController;
    const hexagonLayer: HexagonLayer | undefined = get(gameController.active)?.evacuationController.hexagonLayer;
</script>

<BaseLayer {layer}>
    <Slider slot="Slider"/>
    <Checkbox slot = "2DMode"
    on:change={() => hexagonLayer?.togglePrimitive()}
     labelText = "2D Mode"/>
</BaseLayer>
