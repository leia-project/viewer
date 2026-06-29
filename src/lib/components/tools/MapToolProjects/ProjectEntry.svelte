<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";
	import { AccordionItem, Button, Tag } from "carbon-components-svelte";
	import { Exit } from "carbon-icons-svelte";

	import type { Map } from "$lib/map-cesium/map";
	import type { CesiumProject } from "./project";
	import LayerEntry from "./LayerEntry.svelte";
	import ExpandableDescription from "$lib/components/theme/ExpandableDescription/ExpandableDescription.svelte";

	export let map: Map;
	export let project: CesiumProject;
	$: selected = project.selected;

	let open: boolean = false;

	project.selected.subscribe((selected) => {
		open = selected
	});

	const projectLayers = project.projectSettings.layers;
	$: mapLayers = map.layers;
	$: projectMapLayers = $mapLayers.filter((l) => projectLayers.includes(l.config.id));
	
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
			{#if $selected}
				<Tag type="green" size="sm">{$_('tools.projects.active')}</Tag>
			{/if}
        </div>
    </svelte:fragment>
	<div class="project-content">
		<ExpandableDescription text={project.projectSettings.description} />
		{#if project.projectSettings.layers}
			<ul class="layer-list">
				{#each projectMapLayers as layer}
					<LayerEntry {layer} />
				{/each}
			</ul>
		{/if}
	</div>
	<div class="project-header">
		{#if $selected}
			<Button
				kind="primary"
				size="default"
				icon={Exit}
				on:click={() => map.options.selectedProject.set(undefined)}
			>{$_('tools.projects.leaveProjectView')}</Button>
		{:else}
			<Button
				kind="primary"
				size="default"
				on:click={() => dispatch("activate")}
			>
				{$_('tools.projects.activateProject')}
				<Exit slot="icon" size={20} class="bx--btn__icon"/>
			</Button>
		{/if}
	</div>
</AccordionItem>

<style>

	.item-header {
        display: flex;
        min-width: 95%;
        max-width: 95%;
		justify-content: space-between;
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
        justify-content: end;
        align-items: center;
        align-content: center;
	}

</style>