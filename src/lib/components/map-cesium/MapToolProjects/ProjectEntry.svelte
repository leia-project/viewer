<script lang="ts">
	import type { CesiumProject } from "./project";
	import { createEventDispatcher } from "svelte";
	import { Button } from "carbon-components-svelte";
	import { ZoomIn } from "carbon-icons-svelte";
	import type { Map } from '../../module/map';
	import LayerEntry from "./LayerEntry.svelte";

	export let map: Map;
	export let project: CesiumProject;
	$: selected = project.selected;

	const projectLayers = project.projectSettings.layers;
	$: mapLayers = map.layers;
	$: projectMapLayers = $mapLayers.filter((l) => projectLayers.includes(l.title));
	
	const dispatch = createEventDispatcher();

</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="project">
	<div class="project-header">
		<div class="project-title label-02">{project.projectSettings.name}</div>
		<Button
			icon={ZoomIn}
			size="field"
			iconDescription={$selected ? "Zoom to start view": "Activate project"}
			tooltipPosition="left"
			on:click={() => dispatch("activate")}
		/>
	</div>
	{#if $selected}
		<div class="project-content">
			<div class="project-description">{project.projectSettings.description}</div>
			{#if project.projectSettings.layers}
				<ul class="layer-list">
					{#each projectMapLayers as layer}
						<LayerEntry {layer} />
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
<div class="divider" />


<style>

	.project {
		padding: 5px 10px;
	}
	.project-header {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-content: center;
	}

	.project-description {
		margin: 15px 0 15px;
	}

	.divider {
        background-color: var(--cds-ui-03);
        width: 100%;
        height: 1px;
    }

</style>