
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

import type { Map } from "$lib/components/map-cesium/module/map";
import { getCartesian2, getPolygonCenter, turfPolygonToCartesians } from "./project-helpers";
import type { CesiumProject } from "./project";
import { writable, type Unsubscriber, type Writable, get } from "svelte/store";


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
		this.labelEntities.show = true;
		this.map.viewer.dataSources.add(this.polygonEntities);
		this.polygonEntities.show = true;

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
			  disableDepthTestDistance: Number.POSITIVE_INFINITY
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
			}
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
        if (picked?.id?.label !== undefined) {
            const label = picked.id.label.text.getValue();
            for (const project of get(this.projects)) {
                if (label === project.projectSettings.name) {
                    return project;
                }
            }
        }
        return undefined;
    }

	private leftClickHandle = (m: any) => {
        const project = this.pickProjectFromMouseLocation(m);
        if (project !== get(this.selectedProject) && project !== undefined) {
			this.selectedProject.set(project);
			this.flashPolygons();
		}
    }

    private addMouseEvents(): void {
        this.inputHandler.setInputAction((m: any) => this.leftClickHandle(m), Cesium.ScreenSpaceEventType.LEFT_DOWN);
    }

	private removeMouseEvents(): void {
        this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
    }

}