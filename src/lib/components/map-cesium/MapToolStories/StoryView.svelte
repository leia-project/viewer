<script lang="ts">
	import { onMount, getContext, onDestroy, createEventDispatcher } from "svelte";
	import { writable, get } from "svelte/store";
	import { Button, PaginationNav, Tag } from "carbon-components-svelte";
	import Exit from "carbon-icons-svelte/lib/Exit.svelte";

	import type { Story } from "./Story";
	import type { StoryStep } from "./StoryStep";
	import type { Map } from "../module/map";
	import { LayerConfig } from "$lib/components/map-core/layer-config";
	import type { CameraLocation } from "$lib/components/map-core/camera-location";
	import type { Layer } from "$lib/components/map-core/layer";
	import type { MapCore } from "$lib/components/map-core/map-core";
	import { CesiumLayer } from "../module/layers/cesium-layer";
	import type { StoryLayer } from "./StoryLayer";

	export let map: Map;
	export let story: Story;
	export let savedStepNumber: number;
	export let textBack: string;
	export let textStepBack: string;
	export let textStepForward: string;

	const { getToolContainer, getToolContentContainer } = getContext<any>("mapTools");
	const dispatch = createEventDispatcher();

	let currentPage = writable<number>(1);
	let activeStep: StoryStep | undefined;
	let cesiumMap = map as MapCore;
	let width: number;
	let height: number;
	let navHeigth: number;
	let container: HTMLElement;
	let content: HTMLElement;
	let lastInputType: string;

	let storyLayers = new Array<Layer>();
	let startCameraLocation: CameraLocation;
	let startAutocheckBackground: boolean;
	let startVisibleLayers = new Array<string>();
	let startGlobeOpacity: number;
	let startTerrain: {title: string, url: string, vertexNormals: boolean};

	$: shown = Math.floor(width / 70);

	onMount(() => {
		startCameraLocation = cesiumMap.getPosition();

		let toolContainer = getToolContainer();
		height = toolContainer.clientHeight;

		container = getToolContentContainer();
		container.addEventListener("scroll", onScroll);
		container.addEventListener("wheel", onWheel);
		startAutocheckBackground = map.autoCheckBackground;
		map.autoCheckBackground = false;
		startGlobeOpacity = get(map.options.globeOpacity);
		startTerrain = get(map.options.selectedTerrainProvider);

		setStartVisibleLayers();
		hideAllLayers();

		// Return to step where user left
		currentPage.set(savedStepNumber);
		setTimeout(() => { scrollToStep(savedStepNumber-1) }, 150); // Timeout when height of images is not explicitly set
	});

	onDestroy(() => {
		map.autoCheckBackground = startAutocheckBackground;
		container.removeEventListener("scroll", onScroll);
		container.removeEventListener("wheel", onWheel);
		resetToStart();
		dispatch("closeModule", {n: $currentPage});
	});

	function onScroll() {
		if (lastInputType === "scroll") {
			checkStep();
		}
	}

	function onWheel() {
		lastInputType = "scroll";
	}

	currentPage.subscribe((page) => {
		//Check if processing

		const index = page - 1;
		activeStep = story.steps[index];

		// if clicked on nav index, scroll to step automatically
		if (lastInputType === "click") {
			scrollToStep(index);
		}

		if (activeStep) {
			cesiumMap.flyTo(activeStep.cameraLocation);
				if (activeStep.layers) {
					hideInactiveLayers(activeStep.layers);
					for (let i = 0; i < activeStep.layers?.length; i++) {
						const layerId = activeStep.layers[i].id.toString();
						const added = getAdded(layerId);

						if (added) {
							added.visible.set(true);
							continue
						}

						const libraryLayer = getLibraryLayer(layerId);
						if (libraryLayer) {
							const layerConfig = storyLayerToLayerConfig(activeStep.layers[i], libraryLayer);
							const layer = map.addLayer(layerConfig);
							storyLayers.push(layer);
						}
					}
				}

			if (activeStep.globeOpacity) {
				map.options.globeOpacity.set(activeStep.globeOpacity);
			} else {
				map.options.globeOpacity.set(100);
			}

			const activeTerrain = get(map.options.selectedTerrainProvider);
			if (startTerrain === undefined) startTerrain = activeTerrain; // necessary when loading a story directly via a search param		
			const stepTerrain = get(map.options.terrainProviders).find((t) => { return t.title === activeStep?.terrain });
			if (stepTerrain) {		
				map.options.selectedTerrainProvider.set(stepTerrain);
			} else if (activeTerrain !== startTerrain ) {
				map.options.selectedTerrainProvider.set(startTerrain);
			}
		}
	});

	function scrollToStep(index: number): void {
		const stepElement = getStepElementByIndex(index);
		if (stepElement) {
			container.scrollTo({
				top:
					stepElement.getBoundingClientRect().top -
					content.getBoundingClientRect().top -
					navHeigth
			});
		}
	}

	function storyLayerToLayerConfig(storyLayer: StoryLayer, layerConfig: LayerConfig): LayerConfig {
		const lc = new LayerConfig({
			id: "st_" + layerConfig.id,
			title: layerConfig.title,
			type: layerConfig.type,
			settings: layerConfig.settings,
			isBackground: layerConfig.isBackground,
			defaultOn: true,
			defaultAddToManager: true,
		
		});

		//const lc = new LayerConfig("st_" + layerConfig.id, layerConfig.title, true, true);
		//lc.source = layerConfig.source;

		// Set default style/theme
		if(storyLayer.style) {
			lc.settings.defaultTheme = storyLayer.style;	
		}

		if (storyLayer.opacity) {
			lc.opacity = storyLayer.opacity;
		}

		return lc;
	}

	function setStartVisibleLayers() {
		const visibleLayers = new Array<string>();
		const layers = get(map.layers);
		for (let i = 0; i < layers.length; i++) {
			if (get(layers[i].visible)) {
				visibleLayers.push(layers[i].id);
			}
		}

		startVisibleLayers = visibleLayers;
	}

	function getLibraryLayer(id: string): LayerConfig | undefined {
		const layerConfig = map.layerLibrary.findLayer(id);
		return layerConfig;		
	}

	function resetToStart(): void {
		removeAllLayers();
		restoreStartLayerState();
		map.options.globeOpacity.set(startGlobeOpacity);
		map.options.selectedTerrainProvider.set(startTerrain);
		//map.zoomTo(startCameraLocation);
	}

	function getAdded(storyLayerId: string): Layer | undefined {
		const added = storyLayers.find((l) => {
			return l.id === "st_" + storyLayerId;
		});
		return added;
	}

	function restoreStartLayerState() {
		const layers = get(map.layers);
		for (let i = 0; i < startVisibleLayers.length; i++) {
			const layer = layers.find((l) => {
				return l.id === startVisibleLayers[i];
			});
			if (layer) {
				layer.visible.set(true);
			}
		}
	}

	function hideInactiveLayers(newLayers: Array<StoryLayer>): void {
		for (let i = 0; i < storyLayers.length; i++) {
			const shouldShow = newLayers.find((l) => {
				return "st_" + l.id === storyLayers[i].id;
			});
			if (!shouldShow) storyLayers[i].visible.set(false);
		}
	}

	function hideAllLayers(): void {
		const layers = get(map.layers);
		for (let i = 0; i < layers.length; i++) {
			if (get(layers[i].visible)) {
				layers[i].visible.set(false);
			}
		}
	}

	function removeAllLayers(): void {
		for (let i = 0; i < storyLayers.length; i++) {
			const layer = storyLayers[i];
			if (layer instanceof CesiumLayer) {
				map.removeLayer(layer);
			}
		}
	}
	
	function getStepElementByIndex(index: number): HTMLElement | undefined {
		try {
			const steps = content.getElementsByClassName("step");
			return steps[index] as HTMLElement;
		} catch {
			return undefined;
		}
	}

	function checkStep() {
		const steps = content.getElementsByClassName("step");
		const intersectLine = navHeigth + 200;

		for (let i = 0; i < steps.length; i++) {
			const rect = steps[i].getBoundingClientRect();

			if (intersectLine > rect.y && intersectLine < rect.y + rect.height) {
				if ($currentPage !== i + 1) {
					currentPage.set(i + 1);
				}
				return;
			}
		}
	}

	function backToOverview() {
		dispatch("closeStory");
	}

</script>

<div class="story" bind:clientWidth={width}>
	<div
		class="nav"
		style="width:{width}px"
		bind:clientHeight={navHeigth}
		on:scroll={(e) => {
			e.preventDefault();
			e.stopPropagation();
		}}
	>
		<div class="close">
			<Button
				iconDescription={textBack}
				tooltipPosition="left"
				icon={Exit}
				on:click={backToOverview} 
			/>
		</div>
		<div class="heading-01">
			{story.name}
		</div>
		<div class="story-description body-compact-01">
			{story.description}
		</div>

		<div>
			<PaginationNav
				forwardText={textStepForward}
				backwardText={textStepBack}
				bind:page={$currentPage}
				total={story.steps.length}
				{shown}
				loop
				onmousedown={() => {
					lastInputType = "click";
				}}
			/>
		</div>
	</div>

	<div class="content" bind:this={content}>
		<div style="height:{navHeigth}px" />
		{#each story.steps as step, index}
			<div class="step" id="step_{index}" class:step--active={index + 1 === $currentPage}>
				<div class="step-heading heading-03">
					{step.title}
				</div>
				{@html step.html}
				<div class="tag">
					<Tag>{index + 1}</Tag>
				</div>
			</div>
		{/each}
		<!-- <div style="height:{height}px" /> -->
	</div>
</div>

<style>
	.story {
		height: 100%;
		max-height: 100%;
		width: inherit;
		position: relative;
	}

	.nav {
		position: fixed;
		display: flex;
		justify-content: center;
		flex-direction: column;
		align-items: center;
		background-color: var(--cds-ui-01);
		z-index: 100;
		border-top: 1px solid var(--cds-ui-03);
		border-bottom: 1px solid var(--cds-ui-03);
		padding: var(--cds-spacing-05);
		margin-top: -1px;
	}

	.nav .close {
		position: absolute;
		top: 0;
		right: 0;
	}

	.story-description {
		text-align: center;
	}

	.nav div {
		z-index: 20;
	}

	.content {
		z-index: 1;
		display: flex;
		flex-direction: column;		
	}

	.step {
		min-width: 15rem;
		padding-top: var(--cds-spacing-12);
		padding-bottom: var(--cds-spacing-12);
		padding-left: var(--cds-spacing-05);
		padding-right: var(--cds-spacing-05);
		opacity: 0.8;
		filter: blur(1.5px);
		box-sizing: border-box;

		background: var(--cds-ui-01);
	}

	.step-heading {
		text-decoration: underline;
		padding-bottom: var(--cds-spacing-03);
	}

	.step--active {
		opacity: 1;
		filter: blur(0px);
		transition: 0.8s filter linear;
		background: var(--cds-ui-02);
	}

	.tag {
		position: absolute;
		bottom: var(--cds-spacing-05);
		right: var(--cds-spacing-05);
	}
</style>
