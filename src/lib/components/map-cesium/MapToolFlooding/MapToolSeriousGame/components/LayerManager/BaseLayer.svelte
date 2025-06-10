<script lang="ts">
	import type { Layer } from "$lib/components/map-core/layer";
    import { Checkbox } from "carbon-components-svelte";
	import { get } from "svelte/store";
    export let layer: Layer;
</script>

<div>
    <Checkbox
        checked={get(layer.visible)}
        on:change={() => layer.visible.set(!get(layer.visible))}
        labelText = {layer.title}
    />
</div>
<slot name = "Slider"/>
<slot name = "2DMode"/>