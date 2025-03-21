<script lang="ts">
	import { _ } from "svelte-i18n";
	import { getContext } from "svelte";
	import { Tag } from "carbon-components-svelte";
	import type { ThreedeeLayer } from "../module/layers/threedee-layer";

	export let layer: ThreedeeLayer;
	export let classMapping: Array<string>;

	const { map } = getContext<any>("mapTools");

	type PointCloudClass = {id: string, name: string, selected: boolean}

	let pointCloudClasses = Object.entries(classMapping).map((cls) => {
		return {
			id: cls[0],
			name: cls[1],
			selected: true
		};
	});

	function handleClassChange(cls: PointCloudClass) {
		const updatedClasses = pointCloudClasses.map((item) => {
            if (item.id === cls.id) {
                return { ...item, selected: !item.selected };
            }
            return item;
        });
        pointCloudClasses = updatedClasses;
		let selectedIds = pointCloudClasses.filter((cls) => cls.selected).map((cls) => cls.id)
		layer.filterPointCloudClasses(selectedIds);
		map.refresh()
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if layer}
	<div class="wrapper">
		<div class="heading label-01">{$_('tools.layerManager.filterPointCloudClasses')}</div>
		{#if classMapping}
			{#each pointCloudClasses as cls}
				<Tag type={cls.selected ? 'high-contrast' : 'warm-gray'} style="cursor: pointer" on:click={() => {handleClassChange(cls)}}>
					{cls.name}
				</Tag>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.wrapper {
		padding-bottom: var(--cds-spacing-02);
		overflow: visible;
	}
</style>
