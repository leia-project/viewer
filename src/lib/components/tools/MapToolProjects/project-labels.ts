
import { writable, type Unsubscriber, type Writable, get } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

import type { Map } from "$lib/map-cesium/map";
import { getCartesian2, getPolygonCenter, turfPolygonToCartesians } from "$lib/map-cesium/utils/geo-utils";
import type { CesiumProject } from "./project";


export class ProjectLabels {
	
	public map!: Map;
	private inputHandler!: Cesium.ScreenSpaceEventHandler;

	private labelEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource("project-labels");
	private polygonEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource("project-polygons");
	public show: Writable<boolean> = writable(false);
	public showUnsubscriber!: Unsubscriber;
	private animationTime: number;

	private labelScale = new Cesium.ConstantProperty(1.0);
	private showBackground = new Cesium.ConstantProperty(true);

	private projects: Writable<Array<CesiumProject>>;
	private selectedProject: Writable<CesiumProject | undefined>;

	
	constructor(projects: Writable<Array<CesiumProject>>, selectedProject: Writable<CesiumProject | undefined>, animationTime: number) {
		this.projects = projects;
		this.selectedProject = selectedProject;
		this.animationTime = animationTime;
	}

	public init(map: Map): void {
		this.map = map;
		this.map.viewer.dataSources.add(this.labelEntities);
		this.labelEntities.show = get(this.show);
		this.map.viewer.dataSources.add(this.polygonEntities);
		this.polygonEntities.show = get(this.show);

		this.inputHandler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.scene.canvas);
		this.showUnsubscriber = this.show.subscribe((b: boolean) => {
			this.labelEntities.show = b;
			this.polygonEntities.show = b;
			this.map.viewer.scene.requestRender();
			b ? this.addMouseEvents() : this.removeMouseEvents();
		});
	}

	public addProject(project: CesiumProject): void {
		this.addProjectLabel(project);
		this.addProjectPolygon(project);
	}

	private addProjectLabel(project: CesiumProject): void {
		const location = getPolygonCenter(project.projectSettings.polygon);
		const label = new Cesium.Entity({
			position: Cesium.Cartesian3.fromDegrees(
				location[0],
				location[1],
			),
			label: {
			  text: project.projectSettings.name,
			  scale: this.labelScale,
			  showBackground: this.showBackground,
			  disableDepthTestDistance: Number.POSITIVE_INFINITY,
			  font: '30px \'IBM Plex Sans\''
			}
		});
		this.labelEntities.entities.add(label);
	}

	private addProjectPolygon(project: CesiumProject): void {
		const convexGeom = turfPolygonToCartesians(turf.convex(turf.polygon([project.projectSettings.polygon]).geometry)?.geometry);
		const polygon = new Cesium.Entity({
			polygon: {
				hierarchy: convexGeom,
				material: Cesium.Color.BLACK.withAlpha(0.3)
			},
			properties: new Cesium.PropertyBag({projectName: project.projectSettings.name})
		});
		this.polygonEntities.entities.add(polygon);
	}

	public flashPolygons(): void {
		this.polygonEntities.show = true;
		this.map.viewer.scene.requestRender();
		setTimeout(() => {
			this.polygonEntities.show = false;
			this.map.viewer.scene.requestRender();
		}, this.animationTime);
	}

	private pickProjectFromMouseLocation(m: any): CesiumProject | undefined {
        const location = getCartesian2(m.position);
        const picked = this.map.viewer.scene.pick(location);
		let label = null;
        if (picked?.id?.label !== undefined) {
            label = picked.id.label.text.getValue();
		} else if (picked?.id?.properties?.hasProperty('projectName')) {
			label = picked.id.properties.getValue(this.map.viewer.clock.currentTime)['projectName'];
		}
		for (const project of get(this.projects)) {
			if (label === project.projectSettings.name) {
				return project;
			}
		}
		return undefined;
    }

	private leftDownProject: CesiumProject | undefined;
	private leftDownPosition: { x: number; y: number } | undefined;

	private leftDownHandle = (m: any) => {
		this.leftDownProject = this.pickProjectFromMouseLocation(m);
		this.leftDownPosition = m.position ? { x: m.position.x, y: m.position.y } : undefined;
	}

	private leftUpHandle = (m: any) => {
		const downProject = this.leftDownProject;
		const downPosition = this.leftDownPosition;
		this.leftDownProject = undefined;
		this.leftDownPosition = undefined;
		// Only activate if the press started and ended on the same project without dragging
		if (!downProject || !downPosition || !m.position) return;
		const dx = m.position.x - downPosition.x;
		const dy = m.position.y - downPosition.y;
		if (Math.sqrt(dx * dx + dy * dy) > 5) return;
		const project = this.pickProjectFromMouseLocation(m);
		if (project === downProject && project !== get(this.selectedProject) && project !== undefined) {
			this.selectedProject.set(project);
			this.flashPolygons();
		}
    }

    private addMouseEvents(): void {
        this.inputHandler.setInputAction((m: any) => this.leftDownHandle(m), Cesium.ScreenSpaceEventType.LEFT_DOWN);
        this.inputHandler.setInputAction((m: any) => this.leftUpHandle(m), Cesium.ScreenSpaceEventType.LEFT_UP);
    }

	private removeMouseEvents(): void {
        this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
        this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
    }

}