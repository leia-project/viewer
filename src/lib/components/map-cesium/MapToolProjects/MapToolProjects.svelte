<script lang="ts">
	import { getContext } from "svelte";
	import { _ } from "svelte-i18n";
	import { writable, type Writable } from "svelte/store";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { Map as MapIcon, ViewOffFilled, ViewFilled } from "carbon-icons-svelte";
	import { Accordion, Button } from "carbon-components-svelte";

	import { CesiumProject } from "./project";
	import { ProjectLabels } from "./project-labels";
	import ProjectEntry from "./ProjectEntry.svelte";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	let id: string = "projects";
	export let icon: any = MapIcon;
	export let label: string = "Projects";
	export let showOnBottom: boolean = false;
	

	let projects: Writable<Array<CesiumProject>> = writable(new Array());
	let selectedProject: Writable<CesiumProject | undefined> = writable(undefined);
	let animationTime: number = 1500;

	let projectLabels: ProjectLabels = new ProjectLabels(projects, selectedProject, animationTime);
	$: showLabels = projectLabels.show;

	let tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }

	tool.settings.subscribe((settings) => {
        if (settings) {
            loadProjectsFromSettings(settings);
        }
    });
	
	registerTool(tool);

	map.configLoaded.subscribe((loaded: boolean) => {
		if (loaded) {
			let settings = map.config.tools.find((t: any) => t.id === "projects")?.settings;
			if (settings && settings.projects.length > 0) {
				setSubscribers();
				projectLabels.init(map);
				if (settings.openProject) {
					const openProject = $projects.find((p: CesiumProject) => p.projectSettings.name === settings.openProject);
					if (openProject) {
						activateProject(openProject);
					}
				}
			}
			map.on("Connector fetched", () => $selectedProject?.showProjectLayers()); // Otherwise CKAN layers are not shown when the project is activated on viewer load
		}
	});

    function loadProjectsFromSettings(settings: any): void {
		const configProjects = settings.projects;
		const loadedProjects = new Array<CesiumProject>;
		let projectActivated = false;
		for (let i = 0; i < configProjects.length; i++) {
			const project = new CesiumProject(map, configProjects[i], selectedProject, animationTime);
			loadedProjects.push(project);
			projectLabels.addProject(project);
			if (configProjects[i].enabled && !projectActivated) selectedProject.set(project);
		}
		projects.set([...$projects, ...loadedProjects]);
    }

	function setSubscribers(): void {
		selectedProject.subscribe((project) => {
			if (project) {
				console.log(project)
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

{#if $selectedTool === tool }
	<div class="wrapper">
		<div>
			<div>
				<Button
					icon={$showLabels ? ViewOffFilled : ViewFilled}
					iconDescription={`${$showLabels ? $_('general.buttons.hide') :  $_('general.buttons.show')}`}
					tooltipPosition="left"
					size="small"
					kind="ghost"
					on:click={() => projectLabels.show.set(!$showLabels)}
				/>
			</div>
			<div>
				<div class="bx--label thematic-label">
					{label}
				</div>
				<Accordion >
					{#each $projects as project}
						<ProjectEntry {map} {project} on:activate={() => activateProject(project)} />
					{/each}
				</Accordion>
			</div>
		</div>
	</div>
{/if}

<style>
	.wrapper {
        margin-top: var(--cds-spacing-05);
		margin-left: var(--cds-spacing-05);
		box-sizing: border-box;
    }
</style>
