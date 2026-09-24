import { get, writable, type Readable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { Camera } from "carbon-icons-svelte";
import { Dispatcher } from "$lib/map-core/event/dispatcher";
import type { Map as CesiumMap } from "$lib/map-cesium/map";
import { getTerrainHeight } from "$lib/map-cesium/terrain-util";
import { projectHandler } from "../MapToolProjects/project-handler";
import { selectedStory, showStoryMarkers } from "./story-handler";
import type { Story, StoryMarkerCoordinates } from "./Story";
import StoryHoverBox from "./StoryHoverBox.svelte";
import StoryMarkerTextBubble from "./StoryMarkerTextBubble.svelte";
import StoryImageGallery from "./StoryImageGallery.svelte";

export class StoryMarkerCollection extends Dispatcher {
	private readonly markers = new Cesium.CustomDataSource("story-markers");
	private readonly inputHandler: Cesium.ScreenSpaceEventHandler;
	private readonly toolSelection: Readable<unknown>;
	private stories: Story[] = [];
	private readonly markerStoryMap = new Map<Cesium.Entity, Story>();
	private readonly markerStepMap = new Map<Cesium.Entity, number>();
	private readonly markerLabelMap = new Map<Cesium.Entity, { chapterTitle: string; stepTitle: string }>();
	private readonly markerCoordinates = new Map<Cesium.Entity, StoryMarkerCoordinates>();
	private textBubbles: StoryMarkerTextBubble[] = [];
	private imageGallery: StoryImageGallery | undefined;
	private hoveredMarker: Cesium.Entity | undefined;
	public hoveredStory: Writable<Story | undefined> = writable(undefined);
	public hoverBoxTimeOut: ReturnType<typeof setTimeout> | undefined;
	private hoverBox: StoryHoverBox | undefined;
	private readonly unsubscribers: Unsubscriber[];

	public constructor(
		public readonly map: CesiumMap,
		private readonly icon: any,
		selectedTool: Readable<unknown>
	) {
		super();
		this.toolSelection = selectedTool;
		this.inputHandler = new Cesium.ScreenSpaceEventHandler(map.viewer.scene.canvas);
		map.viewer.dataSources.add(this.markers);
		this.unsubscribers = [
			showStoryMarkers.subscribe(() => this.toggleMarkers()),
			selectedStory.subscribe(() => this.toggleMarkers()),
			selectedTool.subscribe(() => this.toggleMarkers()),
			projectHandler.selectedProject.subscribe(() => this.toggleMarkers()),
			map.options.terrainSwitchReady.subscribe(() => this.updateAllMarkerHeights())
		];
	}

	public load(stories: Story[]): void {
		this.stories = stories;
		this.markers.entities.removeAll();
		this.markerStoryMap.clear();
		this.markerStepMap.clear();
		this.markerLabelMap.clear();
		this.markerCoordinates.clear();
		this.textBubbles.forEach((bubble) => bubble.$destroy());
		this.textBubbles = [];
		const bookMarker = this.createMarkerIcon(this.icon);
		const cameraMarker = this.createMarkerIcon(Camera);

		for (const story of stories) {
			story.markers = [];

			let stepNumber = 0;
			for (const chapter of story.storyChapters) {
				for (const step of chapter.steps) {
					stepNumber++;
					for (const coordinates of step.getMarkerCoordinatesList()) {
						const type = coordinates.type ?? "chapter";

						const marker = new Cesium.Entity(
							type === "text"
								? { position: Cesium.Cartesian3.fromDegrees(coordinates.x, coordinates.y) }
								: {
										position: Cesium.Cartesian3.fromDegrees(coordinates.x, coordinates.y),
										billboard: {
											image: type === "image" ? cameraMarker : bookMarker,
											width: 52,
											height: 52,
											disableDepthTestDistance: Number.POSITIVE_INFINITY,
											verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
											scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1, 3.0e6, 0.1)
										}
									}
						);
						story.markers.push(marker);
						this.markerStoryMap.set(marker, story);
						this.markerStepMap.set(marker, stepNumber);
						this.markerLabelMap.set(marker, { chapterTitle: chapter.title, stepTitle: step.title });
						this.markerCoordinates.set(marker, coordinates);
						this.markers.entities.add(marker);
						this.updateMarkerHeight(marker, coordinates);

						if (type === "text" && coordinates.text) {
							this.textBubbles.push(
								new StoryMarkerTextBubble({
									target: this.map.getContainer(),
									props: { map: this.map, marker, text: coordinates.text }
								})
							);
						}
					}
				}
			}
		}

		this.toggleMarkers();
	}

	private createMarkerIcon(icon: any): string {
		const target = document.createElement("div");
		const iconInstance = new icon({ target });
		const svg = target.querySelector("svg");
		const image = svg
			? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="29" fill="#071b49" stroke="#68b6f7" stroke-width="3"/><g transform="translate(16 16)" fill="#ffffff">${svg.innerHTML}</g></svg>`
			: "";
		iconInstance.$destroy();
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`;
	}

	private updateAllMarkerHeights(): void {
		for (const [marker, coordinates] of this.markerCoordinates) {
			this.updateMarkerHeight(marker, coordinates);
		}
	}

	private async updateMarkerHeight(marker: Cesium.Entity, coordinates: StoryMarkerCoordinates): Promise<void> {
		let height = 2;
		if (this.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
			height = ((await getTerrainHeight(this.map, coordinates.x, coordinates.y)) ?? 0) + 2;
		}

		marker.position = new Cesium.ConstantPositionProperty(
			Cesium.Cartesian3.fromDegrees(coordinates.x, coordinates.y, height)
		);
		this.map.viewer.scene.requestRender();
	}

	public destroy(): void {
		this.unsubscribers.forEach((unsubscribe) => unsubscribe());
		this.hoverBox?.$destroy();
		this.imageGallery?.$destroy();
		this.textBubbles.forEach((bubble) => bubble.$destroy());
		this.inputHandler.destroy();
		this.map.viewer.dataSources.remove(this.markers, true);
	}

	private markersVisible(): boolean {
		const activeToolId = (get(this.toolSelection) as { id?: string } | undefined)?.id;

		return (
			get(showStoryMarkers) &&
			!get(projectHandler.selectedProject) &&
			activeToolId !== "projects" &&
			activeToolId !== "flooding"
		);
	}

	private toggleMarkers(): void {
		const visible = this.markersVisible();
		const openStory = get(selectedStory);
		this.markers.show = visible;
		for (const [marker, story] of this.markerStoryMap) {
			marker.show = !openStory || story === openStory;
		}
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
		const marker = this.getMarker(picked);
		if (!marker) return;
		const coordinates = this.markerCoordinates.get(marker);
		const type = coordinates?.type ?? "chapter";

		if (type === "image" && coordinates?.url) {
			const images = Array.isArray(coordinates.url) ? coordinates.url : [coordinates.url];
			this.openGallery(images);
			return;
		}

		const story = this.getStory(picked);
		const stepNumber = this.markerStepMap.get(marker);
		if (story && stepNumber !== undefined) this.dispatch("story-selected", { story, stepNumber });
	};

	private openGallery(images: Array<string>): void {
		this.imageGallery?.$destroy();
		this.imageGallery = new StoryImageGallery({
			target: this.map.getContainer(),
			props: { images, onClose: () => this.imageGallery?.$destroy() }
		});
	}

	private onHover = (movement: any): void => {
		const picked = this.map.viewer.scene.pick(
			new Cesium.Cartesian2(movement.endPosition.x, movement.endPosition.y)
		);
		const marker = this.getMarker(picked);
		const story = marker ? this.markerStoryMap.get(marker) : undefined;
		const type = marker ? (this.markerCoordinates.get(marker)?.type ?? "chapter") : undefined;
		this.map.container.style.cursor = story ? "pointer" : "default";
		if (marker === this.hoveredMarker) return;
		this.hoveredMarker = marker;
		if (story && marker && type === "chapter") {
			const stepNumber = this.markerStepMap.get(marker);
			const label = this.markerLabelMap.get(marker);
			if (stepNumber === undefined || !label) return;
			clearTimeout(this.hoverBoxTimeOut);
			this.hoverBox?.$destroy();
			this.hoverBox = new StoryHoverBox({
				target: this.map.getContainer(),
				props: { story, marker, stepNumber, chapterTitle: label.chapterTitle, stepTitle: label.stepTitle, collection: this }
			});
			this.hoveredStory.set(story);
		} else {
			this.hoverBoxTimeOut = setTimeout(() => this.hoverBox?.$destroy(), 400);
			this.hoveredStory.set(undefined);
		}
	};
}