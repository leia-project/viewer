import { get, writable, type Readable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { Dispatcher } from "$lib/map-core/event/dispatcher";
import type { Map } from "$lib/map-cesium/map";
import { getTerrainHeight } from "$lib/map-cesium/terrain-util";
import { projectHandler } from "../MapToolProjects/project-handler";
import { selectedStory, showStoryMarkers } from "./story-handler";
import type { Story, StoryMarkerCoordinates } from "./Story";
import StoryHoverBox from "./StoryHoverBox.svelte";

export class StoryMarkerCollection extends Dispatcher {
	private readonly markers = new Cesium.CustomDataSource("story-markers");
	private readonly inputHandler: Cesium.ScreenSpaceEventHandler;
	private readonly toolSelection: Readable<unknown>;
	private readonly storyTool: unknown;
	private stories: Story[] = [];
	private readonly markerStoryMap = new Map<Cesium.Entity, Story>();
	private hoveredMarker: Cesium.Entity | undefined;
	public hoveredStory: Writable<Story | undefined> = writable(undefined);
	public hoverBoxTimeOut: ReturnType<typeof setTimeout> | undefined;
	private hoverBox: StoryHoverBox | undefined;
	private readonly unsubscribers: Unsubscriber[];

	public constructor(
		public readonly map: Map,
		private readonly icon: any,
		selectedTool: Readable<unknown>,
		storyTool: unknown
	) {
		super();
		this.toolSelection = selectedTool;
		this.storyTool = storyTool;
		this.inputHandler = new Cesium.ScreenSpaceEventHandler(map.viewer.scene.canvas);
		map.viewer.dataSources.add(this.markers);
		this.unsubscribers = [
			showStoryMarkers.subscribe(() => this.toggleMarkers()),
			selectedStory.subscribe(() => this.toggleMarkers()),
			selectedTool.subscribe(() => this.toggleMarkers()),
			projectHandler.selectedProject.subscribe(() => this.toggleMarkers())
		];
	}

	public load(stories: Story[]): void {
		this.stories = stories;
		this.markers.entities.removeAll();
		this.markerStoryMap.clear();
		const bookMarker = this.createMarkerIcon();

		for (const story of stories) {
			story.markers = [];

			for (const coordinates of story.getMarkerCoordinatesList()) {
				const marker = new Cesium.Entity({
					position: Cesium.Cartesian3.fromDegrees(coordinates.x, coordinates.y),
					billboard: {
						image: bookMarker,
						width: 52,
						height: 52,
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
						verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
						scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1, 3.0e6, 0.1)
					}
				});
				story.markers.push(marker);
				this.markerStoryMap.set(marker, story);
				this.markers.entities.add(marker);
				this.updateMarkerHeight(marker, coordinates);
			}
		}

		this.toggleMarkers();
	}

	private createMarkerIcon(): string {
		const target = document.createElement("div");
		const icon = new this.icon({ target });
		const svg = target.querySelector("svg");
		const image = svg
			? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="29" fill="#071b49" stroke="#68b6f7" stroke-width="3"/><g transform="translate(16 16)" fill="#ffffff">${svg.innerHTML}</g></svg>`
			: "";
		icon.$destroy();
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`;
	}

	private async updateMarkerHeight(marker: Cesium.Entity, coordinates: StoryMarkerCoordinates): Promise<void> {
		let height = 2;
		if (this.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
			height = (await getTerrainHeight(this.map, coordinates.x, coordinates.y)) ?? 0;
			height += 2;
		}

		marker.position = new Cesium.ConstantPositionProperty(
			Cesium.Cartesian3.fromDegrees(coordinates.x, coordinates.y, height)
		);
	}

	public destroy(): void {
		this.unsubscribers.forEach((unsubscribe) => unsubscribe());
		this.hoverBox?.$destroy();
		this.inputHandler.destroy();
		this.map.viewer.dataSources.remove(this.markers, true);
	}

	private markersVisible(): boolean {
		const activeToolId = (get(this.toolSelection) as { id?: string } | undefined)?.id;
		return (
			get(showStoryMarkers) &&
			!get(selectedStory) &&
			!get(projectHandler.selectedProject) &&
			activeToolId !== "projects" &&
			activeToolId !== "flooding"
		);
	}

	private toggleMarkers(): void {
		const visible = this.markersVisible();
		this.markers.show = visible;
		this.map.viewer.scene.requestRender();

		if (visible) {
			this.inputHandler.setInputAction(this.onClick, Cesium.ScreenSpaceEventType.LEFT_DOWN);
			this.inputHandler.setInputAction(this.onHover, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		} else {
			this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
			this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
			clearTimeout(this.hoverBoxTimeOut);
			this.hoverBox?.$destroy();
			this.hoverBox = undefined;
			this.hoveredMarker = undefined;
			this.hoveredStory.set(undefined);
		}
	}

	private getMarker(picked: any): Cesium.Entity | undefined {
		const marker = picked?.id as Cesium.Entity | undefined;
		return marker && this.markerStoryMap.has(marker) ? marker : undefined;
	}

	private getStory(picked: any): Story | undefined {
		const marker = this.getMarker(picked);
		return marker ? this.markerStoryMap.get(marker) : undefined;
	}

	private onClick = (movement: any): void => {
		const picked = this.map.viewer.scene.pick(
			new Cesium.Cartesian2(movement.position.x, movement.position.y)
		);
		const story = this.getStory(picked);
		if (story) this.dispatch("story-selected", story);
	};

	private onHover = (movement: any): void => {
		const picked = this.map.viewer.scene.pick(
			new Cesium.Cartesian2(movement.endPosition.x, movement.endPosition.y)
		);
		const marker = this.getMarker(picked);
		const story = marker ? this.markerStoryMap.get(marker) : undefined;
		this.map.container.style.cursor = story ? "pointer" : "default";
		if (marker === this.hoveredMarker) return;
		this.hoveredMarker = marker;
		if (story && marker) {
			clearTimeout(this.hoverBoxTimeOut);
			this.hoverBox?.$destroy();
			this.hoverBox = new StoryHoverBox({
				target: this.map.getContainer(),
				props: { story, marker, collection: this }
			});
			this.hoveredStory.set(story);
		} else {
			this.hoverBoxTimeOut = setTimeout(() => this.hoverBox?.$destroy(), 400);
			this.hoveredStory.set(undefined);
		}
	};
}