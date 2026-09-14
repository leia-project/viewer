<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { CesiumProject } from "../classes/project";
	import { Button } from "carbon-components-svelte";
	import { WatsonHealthZoomPan, Home, ViewOffFilled, ViewFilled } from "carbon-icons-svelte";
	import LayerEntry from "./LayerEntry.svelte";
	import ExpandableDescription from "$lib/components/theme/ExpandableDescription/ExpandableDescription.svelte";
	import { projectHandler } from "../project-handler";

	export let project: CesiumProject;

	const selectedProject = projectHandler.selectedProject;
	$: isProcessing = project.processing;
	$: selected = $selectedProject === project;

	const clip = projectHandler.clip;

	$: projectLayers = project.layers;
	
</script>


<div class="project" class:active={selected}>
	<div class="project-header">
		<div class="project-title label-02">{project.projectConfig.name}</div>
		<div class="project-buttons">
			{#if !selected}
				<Button
					icon={WatsonHealthZoomPan}
					size="small"
					kind="primary"
					iconDescription={$_("tools.projects.activateProject")}
					tooltipPosition="bottom"
					tooltipAlignment="end"
					disabled={$isProcessing}
					on:click={() => selectedProject.set(project)}
				/>
			{:else}
				<Button
					icon={$clip ? ViewFilled : ViewOffFilled}
					size="small"
					kind="ghost"
					iconDescription={`${$clip ? $_("tools.projects.show") : $_("tools.projects.hide")} ${$_("tools.projects.environment")}`}
					tooltipPosition="bottom"
					tooltipAlignment="end"
					on:click={() => clip.set(!$clip)}
				/>
				<Button
					icon={Home}
					size="small"
					kind="ghost"
					iconDescription={$_("tools.projects.zoomToStartView")}
					tooltipPosition="bottom"
					tooltipAlignment="end"
					on:click={() => project.projectCamera.zoomToProject()}
				/>
			{/if}
		</div>
	</div>
	{#if selected}
		<div class="project-content">
			<div class="project-description">
				<ExpandableDescription text={project.projectConfig.description} />
			</div>
			{#if projectLayers.length > 0}
				<ul class="layer-list">
					{#each projectLayers as projectLayer}
						<LayerEntry {projectLayer} {isProcessing} />
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
<div class="divider" />


<style>

	.project {
		margin-left: var(--cds-spacing-05);
		padding: 5px 10px;
	}
	.project.active, .project:hover {
		background-color: var(--cds-ui-01);
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