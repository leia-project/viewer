import { writable, type Unsubscriber, type Writable, get } from "svelte/store";
import * as Cesium from "cesium";
import { Dispatcher } from "$lib/map-core/event/dispatcher";
import type { Map } from "$lib/map-cesium/map";
import { projectHandler, type IProjectConfig, type IProjectToolConfig } from "../project-handler";
import { CesiumProject } from "./project";
import ProjectHoverBox from "../components/ProjectHoverBox.svelte";

export abstract class ProjectCollectionBase<
	Config extends IProjectConfig,
	Project extends CesiumProject
> extends Dispatcher {
	public map: Map;
	public projects: Writable<Array<Project>> = writable([]);
	private animationTime: number;

	public hoveredProject: Writable<Project | undefined> = writable(undefined);
	private hoverBox: ProjectHoverBox | undefined;
	public hoverBoxTimeOut: any;

	private inputHandler!: Cesium.ScreenSpaceEventHandler;
	private markerEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource("project-labels");
	private polygonEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource(
		"project-polygons"
	);
	public show: Writable<boolean> = writable(true);

	private showUnsubscriber!: Unsubscriber;
	private projectUnsubscriber!: Unsubscriber;
	private hoveredProjectUnsubscriber!: Unsubscriber;

	constructor(map: Map, animationTime: number) {
		super();
		this.map = map;
		this.animationTime = animationTime;
	}

	public abstract createProject(projectConfig: Config): Project;

	public load(settings: IProjectToolConfig<Config>): void {
		this.loadProjectsFromSettings(settings.projects);
		this.init();
		if (settings.openProject) {
			const openProjectIndex = get(this.projects).find(
				(p: Project) => p.projectConfig.name === settings.openProject
			);
			if (openProjectIndex) {
				projectHandler.selectedProject.set(openProjectIndex);
			}
		}
	}

	private loadProjectsFromSettings(configProjects: Array<Config>): void {
		for (let i = 0; i < configProjects.length; i++) {
			this.addProject(configProjects[i]);
		}
	}

	public addProject(config: Config, renderProjectInfo: boolean = true): void {
		const project = this.createProject(config);
		if (!project) return;

		if (renderProjectInfo) {
			if (project.marker) {
				this.markerEntities.entities.add(project.marker);
			}
			this.polygonEntities.entities.add(project.polygon);
		}

		this.projects.set([...get(this.projects), project]);
	}

	public activateProjectByIndex(index: number): void {
		const projects = get(this.projects);
		if (index >= projects.length) return;
		if (projects[index] !== get(projectHandler.selectedProject)) {
			projectHandler.selectedProject.set(projects[index]);
		}
	}

	public init(): void {
		this.map.viewer.dataSources.add(this.markerEntities);
		this.markerEntities.show = true;
		this.map.viewer.dataSources.add(this.polygonEntities);
		this.polygonEntities.show = true;

		this.inputHandler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.scene.canvas);

		this.showUnsubscriber = this.show.subscribe((b: boolean) => this.toggleMarkers());

		this.projectUnsubscriber = projectHandler.selectedProject.subscribe((project) => {
			if (project) {
				this.onProjectSwitch();
				this.hoverBox?.$destroy();
			}
			this.toggleMarkers();
		});

		this.hoveredProjectUnsubscriber = this.hoveredProject.subscribe(
			(project: Project | undefined) => {
				if (project) {
					clearTimeout(this.hoverBoxTimeOut);
					this.hoverBox?.$destroy();
					this.hoverBox = new ProjectHoverBox({
						target: this.map.getContainer(),
						props: {
							project: project,
							collection: this
						}
					});
				} else {
					this.hoverBoxTimeOut = setTimeout(() => this.hoverBox?.$destroy(), 400);
				}
			}
		);
	}

	public onProjectSwitch(): void {
		this.polygonEntities.show = true;
		this.map.viewer.scene.requestRender();
		setTimeout(() => {
			this.polygonEntities.show = false;
			this.map.viewer.scene.requestRender();
		}, this.animationTime);
	}

	private toggleMarkers(): void {
		const show = get(this.show) && !get(projectHandler.selectedProject);
		this.markerEntities.show = show;
		this.polygonEntities.show = show;
		this.map.viewer.scene.requestRender();
		show ? this.addMouseEvents() : this.removeMouseEvents();
	}

	private pickProjectFromMouseLocation(m: any): CesiumProject | undefined {
		const location = new Cesium.Cartesian2(m.position.x, m.position.y);
		const picked = this.map.viewer.scene.pick(location);
		if (picked?.id !== undefined) {
			return this.getProjectFromMarker(picked.id);
		}
		return undefined;
	}

	private getProjectFromMarker(marker: Cesium.Entity): Project | undefined {
		for (const project of get(this.projects)) {
			if (project.marker === marker) return project;
		}
		return undefined;
	}

	private leftClickHandle = (m: any) => {
		const project = this.pickProjectFromMouseLocation(m);
		if (project) {
			this.dispatch("project-selected", project);
		}
	};

	private onHover = (picked: any) => {
		let proj: Project | undefined;
		if (picked?.id) {
			proj = this.getProjectFromMarker(picked.id);
			if (proj) clearTimeout(this.hoverBoxTimeOut);
			if (proj !== get(this.hoveredProject)) {
				this.hoveredProject.set(proj);
			}
		}
		this.map.container.style.cursor = proj ? "pointer" : "default";
		if (!proj) this.hoveredProject.set(undefined);
	};

	private addMouseEvents(): void {
		this.inputHandler?.setInputAction(
			(m: any) => this.leftClickHandle(m),
			Cesium.ScreenSpaceEventType.LEFT_DOWN
		);
		this.inputHandler?.setInputAction((m: any) => {
			const picked = this.map.viewer.scene.pick(new Cesium.Cartesian2(m.endPosition.x, m.endPosition.y));
			this.onHover(picked);
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}

	private removeMouseEvents(): void {
		this.inputHandler?.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
		this.inputHandler?.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}
}

export class ProjectCollection extends ProjectCollectionBase<IProjectConfig, CesiumProject> {
	public createProject(projectConfig: IProjectConfig): CesiumProject {
		return new CesiumProject(this.map, projectConfig);
	}
}

