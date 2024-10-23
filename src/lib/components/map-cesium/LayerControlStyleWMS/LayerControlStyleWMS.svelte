<!-- TODO CHANGE COPIED STUFF TO REAL STUFF!! -->

<script lang="ts">
	import type { List } from "carbon-icons-svelte";
    import { _ } from "svelte-i18n";

	import type { Writable } from "svelte/store";
	import { Dropdown } from "carbon-components-svelte";
	import type { WmsLayer } from "../module/layers/wms-layer";
	import { text } from "@sveltejs/kit";

    export let layer: WmsLayer;

    function getDropdownList(): Array<{id: number; text: string}> {
		const items = [];
        const len = layer.styleControl?.props?.styles?.length;

		for (let i=0; i<layer.styleControl?.props.styles.length; i++) {
			items.push({
				id: i + 1,
				text: layer.styleControl?.props.styles[i].propertyName
			});
		}
		return items;
	}

    const firstStyleName = (layer.styleControl?.props as { styles: string[] }).styles[0] || "Test Failed";

    let dropdownStylesWMS = getDropdownList();
    let activeStyleWMS = dropdownStylesWMS[0];
</script>

<!-- can't get dropdown list to work -->

<!-- <div class="wrapper">
    <div class="control-section">
        <div class="control-header">{ $_('tools.layerManager.extrusion') }</div>
        <div class="wrapper">
			<Dropdown
				bind:selectedId={activeStyleWMS}
				items={dropdownStylesWMS}
				size="sm"
				on:select={(e) => console.log(e, ': Selected something...')}
			></Dropdown>
        </div>
    </div>
</div> -->


<!-- Testing only -->

<div class="wrapper">
    <div class="control-section">
        <div class="control-header">{ $_('tools.layerManager.extrusion') }</div>
        <div class="wrapper">
			<Dropdown
				selectedId="0"
                items={[
                    { id: "0", text: firstStyleName },
                    { id: "1", text: "Item 2" },
                    { id: "2", text: "Item 3" },
                ]}
				size="sm"
				on:select={(e) => console.log(e.detail.selectedItem, ': Selected something...')}
			></Dropdown>
        </div>
    </div>
</div>

<style>
    .wrapper {
		margin: 10px 0 15px;
	}
</style>