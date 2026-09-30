<script lang="ts">
	import { getContext } from "svelte";
	import { _ } from "svelte-i18n";
	import { Dropdown } from "carbon-components-svelte";
	import { WatsonHealth3DMprToggle } from "carbon-icons-svelte";
	import Divider from "$lib/components/theme/Divider/Divider.svelte";
	import { MapToolMenuOption } from "../MapToolMenuOption";

	import { CesiumProject } from "./classes/project";
	import ProjectEntry from "./components/ProjectEntry.svelte";
	import { ProjectCollection } from "./classes/project-collection";
	import { projectHandler } from "./project-handler";
	import ToggleView from "./components/ToggleView.svelte";

	import type { Map } from "$lib/map-cesium/map";

	const { map, registerTool, selectedTool } = getContext<{
		map: Map;
		registerTool: any;
		selectedTool: any;
	}>("mapTools");

	export let id: string = "projects";
	const icon: any = WatsonHealth3DMprToggle;
	export let label: string = "Projects";

	let tool: any;
	let parentTool: any;
	let showFullList: boolean = false;

	const projectCollection = new ProjectCollection(map, 2500);
	const showLabels = projectCollection.show;
	const projects = projectCollection.projects;
	const selectedProject = projectHandler.selectedProject;

	projectCollection.on("project-selected", (project) => {
		if (project instanceof CesiumProject) projectHandler.selectedProject.set(project);
	});

	$: isProcessing = $selectedProject?.processing;
	$: dropdownItems = $projects.map((p: CesiumProject, idx: number) => ({
		id: idx,
		text: p.projectConfig.name
	}));
	$: selectedProjectId = $projects.findIndex((p: CesiumProject) => p === $selectedProject);

	//tool.settings.subscribe((settings: any) => {
	map.configLoaded.subscribe((loaded: boolean) => {
		if (loaded) {
			const settings = map.toolSettings.find((t: any) => t.id === id)?.settings;

			if (settings) {
				const appearance = settings.appearance;

				if (
					appearance?.parentTool &&
					map.toolSettings.find((t: any) => t.id === appearance?.parentTool)
				) {
					parentTool = appearance.parentTool;
				} else {
					tool = new MapToolMenuOption(id, icon, label, false);
					registerTool(tool);
				}

				projectHandler.clip.set(appearance?.clip ?? true);

				showFullList = appearance?.listAll ?? false;
				map.ready.subscribe((b: boolean) => {
					if (b) {
						const preloadedProjects = settings.projects;
						if (preloadedProjects) {
							projectCollection.load(settings);
						}
					}
				});
			}
		}
	});
</script>

{#if (tool && $selectedTool === tool) || (parentTool && $selectedTool?.id === parentTool)}
	<div id="tool-projects">
		{#if parentTool}
			<Divider />
			<div class="project-tool-header">
				<div class="heading-03">{$_("tools.projects.projects")}</div>
			</div>
			<div class="bottom-container">
				{#if !$selectedProject}
					<ToggleView
						bind:show={$showLabels}
						text={$_("tools.projects.showOnMap")}
					/>
				{/if}
			</div>
		{/if}

		{#if !showFullList}
			<div class="projects-dropdown">
				<Dropdown
					titleText={$_("tools.projects.selectProject")}
					label="..."
					invalidText={$_("tools.projects.validValueRequired")}
					selectedId={selectedProjectId}
					items={dropdownItems}
					let:index
					let:item
					disabled={$isProcessing}
					on:select={(e) => projectCollection.activateProjectByIndex(e.detail.selectedId)}
				>
					<!--{index}-{item.text}-->
				</Dropdown>
			</div>
		{/if}

		<div class="projects">
			{#if showFullList}
				{#each $projects as project}
					<ProjectEntry {project} />
				{/each}
			{:else if $selectedProject}
				<ProjectEntry project={$selectedProject} />
			{/if}
		</div>
	</div>

	{#if !parentTool}
		<div class="bottom-container">
			{#if !$selectedProject}
				<ToggleView
					bind:show={$showLabels}
					text={$_("tools.projects.showOnMap")}
				/>
			{/if}
		</div>
	{/if}
{/if}

<style>
	#tool-projects {
		min-height: 600px;
	}

	.project-tool-header {
		margin-top: 40px;
		padding: 10px var(--cds-spacing-05) 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.project-tool-header .heading-03 {
		margin-bottom: 0;
	}

	.projects-dropdown {
		padding: 25px 20px 40px;
	}

	.bottom-container {
		margin-top: 50px;
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		padding: 15px 10px 25px;
		height: auto;
		overflow: hidden;
	}
</style>
