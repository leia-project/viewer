<script lang="ts">
	import type { CesiumProject } from "./project";
	import { createEventDispatcher } from "svelte";
	import { AccordionItem, Button } from "carbon-components-svelte";
	import { ZoomIn } from "carbon-icons-svelte";
	import type Map from "$lib/components/Map.svelte";
	import LayerEntry from "./LayerEntry.svelte";

	export let map: Map;
	export let project: CesiumProject;
	$: selected = project.selected;

	let open: boolean = false;

	project.selected.subscribe((selected) => {
		open = selected
	});

	const projectLayers = project.projectSettings.layers;
	$: mapLayers = map.layers;
	$: projectMapLayers = $mapLayers.filter((l) => projectLayers.includes(l.title));
	
	const dispatch = createEventDispatcher();

</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<AccordionItem bind:open>
	<svelte:fragment slot="title">
        <div class="item-header">
            <div
                class="project-title"
            >
                <div class="label-01" class:project-title-condensed={open === false} title={project.projectSettings.name}>
                    {project.projectSettings.name}
                </div>
            </div>
        </div>
    </svelte:fragment>
	<div class="project-header">
		<Button
			icon={ZoomIn}
			size="field"
			iconDescription={$selected ? "Zoom to start view": "Activate project"}
			tooltipPosition="left"
			on:click={() => dispatch("activate")}
		/>
	</div>
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
	{$selected}
</AccordionItem>

<style>

	.item-header {
        display: flex;
        min-width: 95%;
        max-width: 95%;
        justify-content: left;
        align-items: center;
        overflow: hidden;
    }

	.project-title {
		display: flex;
        align-items: center;
    }

    .project-title-condensed {
        max-width: 15rem;
        white-space: nowrap;
        display: inline-block;
        overflow: hidden !important;
        text-overflow: ellipsis;
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



</style>