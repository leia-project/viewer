<!-- TODO CHANGE COPIED STUFF TO REAL STUFF!! -->

<script lang="ts">
	import type { List } from "carbon-icons-svelte";
    import { _ } from "svelte-i18n";

	import type { Writable } from "svelte/store";
	import { Dropdown } from "carbon-components-svelte";
	import type { WmsLayer } from "../module/layers/wms-layer";
	import { text } from "@sveltejs/kit";

    export let layer: WmsLayer;
	export let styles: Array<string>;

	$: dropdownStyles = styles.map((v, i) => ({ id: i, text: v }));
	$: activeStyleId = "0"

</script>

<!-- Fix layer reloading. Change extrusion control-header -->

<div class="wrapper">
    <div class="control-section">
        <div class="control-header">{ $_('tools.layerManager.extrusion') }</div>
        <div class="wrapper">
			<Dropdown
				selectedId={activeStyleId}
				items={dropdownStyles}
				size="sm"
				on:select={(e) => 
					{
						console.log(`Selected ${e.detail.selectedItem.text}`);

						// Reload the layer with the selected style
						layer.remove();
						layer.createLayer(selectedStyle=dropdownStyles[activeStyleId]);
					}	
				}
			></Dropdown>
        </div>
    </div>
</div>

<style>
    .wrapper {
		margin: 10px 0 15px;
	}
</style>