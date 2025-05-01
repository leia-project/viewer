<script lang="ts">
	import type { List } from "carbon-icons-svelte";
    import { _, number } from "svelte-i18n";

	import type { Writable } from "svelte/store";
	import { Dropdown } from "carbon-components-svelte";
	import type { WmsLayer } from "../module/layers/wms-layer";
	import { text } from "@sveltejs/kit";
	import { map } from "@observablehq/plot";

	export let layer : WmsLayer;
	export let styles: Array<string>;
	let selectedStyle: null;
	
	$: dropdownStyles = styles.map((v, i) => ({ id: i, text: v }));
	$: activeStyleId = "0"


</script>
//error because Those errors all mean that Cesium asked your WMS server for tiles outside of what it can actually draw (or using the “wrong” projection), 
//so the server is returning an error instead of an image. By default, WebMapServiceImageryProvider will:
//Use the WebMercator tiling scheme (EPSG:3857),
//Ask for tiles up to an essentially infinite zoom, across the whole world.

<div class="wrapper">
    <div class="control-section">
        <div class="control-header">{ $_('tools.layerManager.extrusion') }</div>
        <div class="wrapper">
			<Dropdown
        bind:selectedId={activeStyleId}
        items={dropdownStyles}
        size="sm"
        on:select={e => {
          // lookup the style name
          const styleName = e.detail.selectedItem.text;
		  console.log (styleName)
          // tell the layer to swap styles
          layer.updateStyle(styleName);
        }}
      />
        </div>
    </div>
</div>

<style>
    .wrapper {
		margin: 10px 0 15px;
	}
</style>