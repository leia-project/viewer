<script lang="ts">
	import { RadioButton, RadioButtonGroup } from "carbon-components-svelte";
	import type { QALayer } from "../../module/map-layers/qa-layer";

	export let qaLayer: QALayer;
	
	const selectedCategory = qaLayer.selectedCategory;
	const activeColorMap = qaLayer.colorMap;

</script>


{#if qaLayer?.colorCategories && $activeColorMap}
	<div class="style-container">
		{#if qaLayer?.colorCategories.length > 1}
			<RadioButtonGroup
				selected={$selectedCategory}
			>
				{#each qaLayer.colorCategories as category}
					<RadioButton value={category} labelText={category} />	
				{/each}		
			</RadioButtonGroup>
		{/if}
		<div class="color-map-labels">
			<div class="color-map-min">{$activeColorMap[0].value}</div>
			<div class="color-map-max">{$activeColorMap[$activeColorMap.length - 1].value}</div>
		</div>
		<div class="color-map-gradient">
			{#each $activeColorMap as cVal}
				<div class="color-map-item" style="background-color: {cVal.color}"></div>
			{/each}
		</div>
	</div>
{/if}


<style>

	.style-container {
		margin: 1rem 0;
	}
	.color-map-gradient {
		display: flex;
		width: 100%;
	}
	.color-map-item {
		height: 14px;
		width: 100%;
	}
	.color-map-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--surface-600);
		margin: 0.75rem 0 0.25rem;
	}

</style>