<script lang="ts">
	import { getContext } from "svelte";
	import { _ } from "svelte-i18n";
	import { get, writable, type Writable } from 'svelte/store';
	import { Button } from 'carbon-components-svelte';
	import { Add, ViewOffFilled, ViewFilled } from "carbon-icons-svelte";

	import Divider from "$lib/components/ui/components/Divider/Divider.svelte";

	import { CesiumProject } from './project';
	import { ProjectLabels } from './project-labels';
	import ProjectEntry from './ProjectEntry.svelte';


	const { map, selectedTool } = getContext<any>("mapTools");
	
	let targetTool: string = "bookmarks";
	let projects: Writable<Array<CesiumProject>> = writable(new Array());
	let selectedProject: Writable<CesiumProject | undefined> = writable(undefined);
	let animationTime: number = 1500;

	let projectLabels: ProjectLabels = new ProjectLabels(projects, selectedProject, animationTime);
	$: showLabels = projectLabels.show;
	
	map.configLoaded.subscribe((loaded: boolean) => {
		if (loaded) {
			const bookmarkSettings = map.config.tools.find((t: any) => t.id === "bookmarks")?.settings;
			const preloadedProjects = bookmarkSettings.projects;
			if (preloadedProjects) {
				setSubscribers();
				const preload = loadProjectsFromSettings(preloadedProjects);
				projectLabels.init(map);
				if (bookmarkSettings.openProject) {
					const openProject = preload.find((p: CesiumProject) => p.projectSettings.name === bookmarkSettings.openProject);
					if (openProject) {
						activateProject(openProject);
					}
				}
			}
			map.on("Connector fetched", () => $selectedProject?.showProjectLayers()); // Otherwise CKAN layers are not shown when the project is activated on viewer load
		}
	});


    function loadProjectsFromSettings(configProjects: any): Array<CesiumProject> {
		const newProjects = new Array();
		let projectActivated = false;
		for (let i = 0; i < configProjects.length; i++) {
			const project = new CesiumProject(map, configProjects[i], selectedProject, animationTime);
			newProjects.push(project);
			projectLabels.addProject(project);
			if (configProjects[i].enabled && !projectActivated) selectedProject.set(project);
		}
		projects.set([...$projects, ...newProjects]);
		return newProjects;
    }

	function setSubscribers(): void {
		selectedProject.subscribe((project) => {
			if (project) {
				map.options.selectedProject.set(project.projectSettings.name);
				projectLabels.show.set(false);
				projectLabels.flashPolygons();
			}
		})

		map.options.selectedProject.subscribe((project: string | undefined) => {
			if (project === undefined) {
				selectedProject.set(undefined);
			}
		});
	}

	function activateProject(project: CesiumProject): void {
		if ($selectedProject?.processing) return;
		if ($selectedProject === project) {
			project.projectCamera.zoomToProject();
			return;
		}
		$selectedProject?.deactivate();
		selectedProject.set(project)
	}

</script>


{#if $selectedTool?.id === targetTool && $projects.length > 0 }
	<div class="projects-container">
		<Divider />
		<div class="project-tool-header">
			<div class="heading-03">Projects</div>
			{#if !$selectedProject}
				<Button
					icon={$showLabels ? ViewOffFilled : ViewFilled}
					iconDescription={`${$showLabels ? $_('general.buttons.hide') :  $_('general.buttons.show')}`}
					tooltipPosition="left"
					size="small"
					kind="ghost"
					on:click={() => projectLabels.show.set(!$showLabels)}
				/>
			{/if}
		</div>
		<div class="projects">
			{#each $projects as project}
				<ProjectEntry {map} {project} on:activate={() => activateProject(project)} />
			{/each}
		</div>
	</div>
{/if}

<!--
<div class="add-button">
	<Button
		kind="primary"
		size="default"
		icon={Add}
	>
		Make new project
	</Button>
</div>
-->


<style>

	.projects-container {
		margin-top: 40px;
	}
	.project-tool-header {
		padding: 10px var(--cds-spacing-05) 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.project-tool-header .heading-03 {
		margin-bottom: 0;
	}
	.add-button {
		margin-top: 30px;
	}

</style>