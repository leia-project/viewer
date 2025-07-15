<script lang="ts">
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { onMount, getContext, onDestroy, createEventDispatcher } from "svelte";
	import { writable, get } from "svelte/store";
	import { Button, PaginationNav, Tag, Loading } from "carbon-components-svelte";
	import Exit from "carbon-icons-svelte/lib/Exit.svelte";
	import "@carbon/charts-svelte/styles.css";

	import type { Story } from "./Story";
	import type { StoryStep } from "./StoryStep";
	import type { Map } from "../module/map";
	import { LayerConfig } from "$lib/components/map-core/layer-config";
	import type { CameraLocation } from "$lib/components/map-core/camera-location";
	import type { Layer } from "$lib/components/map-core/layer";
	import type { MapCore } from "$lib/components/map-core/map-core";
	import { CesiumLayer } from "../module/layers/cesium-layer";
	import type { StoryLayer } from "./StoryLayer";
	import type { StoryChapter } from "./StoryChapter";
	import CustomPaginationNav from "./CustomPaginationNav.svelte";
	import DrawPolygon from "./DrawPolygon.svelte";
	import { getCameraPositionFromBoundingSphere } from "../module/utils/layer-utils";
	import { polygonStore } from './PolygonEntityStore';
	import StoryChart from "./StoryChart.svelte";

	type LegendOptions = {
		[key: string]: string;
	};

	export let map: Map;
	export let story: Story;
	export let savedStepNumber: number;
	export let textBack: string;
	export let textStepBack: string;
	export let textStepForward: string;
	export let layerLegends: Array<LegendOptions>; 

	$: use3Dmode = map.options.use3DMode;

	const { getToolContainer, getToolContentContainer } = getContext<any>("mapTools");
	const dispatch = createEventDispatcher();

	let currentPage = writable<number>(1);
	let activeStep: StoryStep | undefined;
	let activeChapter: StoryChapter | undefined;
	let activeChapterSteps: Array<StoryStep> | undefined;
	let cesiumMap = map as MapCore;
	let width: number;
	let height: number;
	let navHeight: number;
	let container: HTMLElement;
	let content: HTMLElement;
	let lastInputType: string;

	let storyLayers = new Array<Layer>();
	let startCameraLocation: CameraLocation;
	let startAutocheckBackground: boolean;
	let startVisibleLayers = new Array<string>();
	let startGlobeOpacity: number;
	let startTerrain: {title: string, url: string, vertexNormals: boolean};

	let polygonArea: number = 0;
	let hasDrawnPolygon: boolean;
	let polygonCameraLocation: CameraLocation | undefined = undefined; // Used instead of CL if project area is drawn by user
	let distributions: Array<{ group: string; value: number }[]>;
	

	$: shown = Math.floor(width / 70);

	const unsubscribePolygonEntity = polygonStore.subscribe(polygon => {
		if (polygon?.polygonEntity) {
			const use3DMode = get(map.options.use3DMode);
			const vertices: Array<number> = [];

			// Assuming the entity has a polygon or polyline geometry
			const entity = polygon.polygonEntity;

			// You probably mean polygon geometry, not polyline — adjust as needed
			const positions = entity.polygon?.hierarchy?.getValue(map.viewer.clock.currentTime)?.positions
				|| entity.polyline?.positions?.getValue(map.viewer.clock.currentTime);

			if (positions && positions.length > 0) {
				for (let j = 0; j < positions.length; j++) {
					vertices.push(positions[j].x, positions[j].y, positions[j].z);
				}

				const boundingSphere = Cesium.BoundingSphere.fromVertices(vertices, Cesium.Cartesian3.ZERO, 3);
				const polygonCameraLocation = getCameraPositionFromBoundingSphere(boundingSphere, use3DMode);
				cesiumMap.flyTo(polygonCameraLocation);
			}
		}
	});

	// Flatten the steps across all chapters so we can access the correct step based on the index
	let flattenedSteps: Array<{ step: StoryStep; chapter: StoryChapter }> = [];
		story.storyChapters.forEach((chapter) => {
			chapter.steps.forEach((step) => {
				flattenedSteps.push({ step, chapter });
			});
		});

	onMount(() => {
		if (use3Dmode) map.options.use3DMode.set(false);
		if (story.disableModeSwitcher) map.options.disableModeSwitcher.set(true);

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
		if (story.disableModeSwitcher) map.options.disableModeSwitcher.set(false);

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
		const index = page - 1;

		// Flatten the steps across all chapters so we can access the correct step based on the index
		const flattenedSteps: Array<{ step: StoryStep; chapter: StoryChapter }> = [];
		story.storyChapters.forEach((chapter) => {
			chapter.steps.forEach((step) => {
				flattenedSteps.push({ step, chapter });
			});
		});
		const activeEntry = flattenedSteps[index];
		activeChapter = activeEntry.chapter;
		activeChapterSteps = activeChapter.steps;
		activeStep = activeEntry.step;

		// if clicked on nav index, scroll to step automatically
		if (lastInputType === "click") {
			scrollToStep(index);
		}

		if (activeStep) {
			cesiumMap.flyTo(polygonCameraLocation ?? activeStep.cameraLocation);
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
					navHeight
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
		const intersectLine = navHeight + 200; //TODO: make this dynamic

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
		bind:clientHeight={navHeight}
		on:scroll={(e) => {
			e.preventDefault();
			e.stopPropagation();
		}}
	>
		<div class="close">
			<Button
				kind="tertiary"
				iconDescription={textBack}
				tooltipPosition="left"
				icon={Exit}
				on:click={backToOverview} 
			/>
		</div>
		<div class="heading-03" style="font-weight: bold">
			{story.name}
		</div>
		<!-- <div class="story-description body-compact-01">
			{story.description}
		</div> -->

		<div class="chapter-buttons">
			<DrawPolygon {map} {story} bind:distributions={distributions} bind:polygonArea={polygonArea} bind:hasDrawnPolygon={hasDrawnPolygon}/>
			{#each story.storyChapters as chapter, index}
				<Button
					kind={activeChapter === chapter ? "primary" : "ghost"}
					size="small"
					style="margin: 0.1rem; padding: 0 8px; width: fit-content; min-width: 30px;"
					on:click={() => {
						const firstStepIndex = flattenedSteps.findIndex(({ chapter: c }) => c === chapter);
						if (firstStepIndex !== -1) {
							lastInputType = "click";
							currentPage.set(firstStepIndex + 1);
						}
					}}
				>
				{chapter.buttonText}
				</Button>
			{/each}
		</div>
		<hr style="width: 100%;"/>
		<div>
			<CustomPaginationNav
				bind:page={$currentPage}
				bind:lastInputType ={lastInputType}
				{flattenedSteps}
			/>

			<!-- <PaginationNav
				forwardText={textStepForward}
				backwardText={textStepBack}
				bind:page={$currentPage}
				total={flattenedSteps.length}
				{shown}
				loop
				onmousedown={() => {
					lastInputType = "click";
				}}
			/> -->
		</div>
	</div>

	<div class="content" bind:this={content}>
		<div style="height:{navHeight}px" />
		{#each flattenedSteps as { step, chapter }, index}
			<div class="step" id="step_{index}" class:step--active={index + 1 === $currentPage}>
				<div class="step-heading heading-01">
					{chapter.title}
				</div>
				<div class="step-heading heading-04">
					{step.title}
				</div>
				<div class="step-heading-sub heading-03">
					{$_("tools.stories.description")}
				</div>
				{@html step.html}
				{#each step.layers ?? [] as layer}
					Layer {layer.id}: {layer.featureName}
				{/each}
				
				<div class="step-heading-sub heading-03">
					{$_("tools.stories.statistics")}
				</div>
				<div class="step-stats">
					{#if distributions && distributions[index]}
						<StoryChart data={distributions[index]} />
						<br><br><br>
						<ul>
							{#each distributions[index] as key}
								{#if layerLegends[index] && key.value > 0 && layerLegends[index][key.group]} 
									<li>
										<strong>{key.group}: </strong>{layerLegends[index][key.group]}
									</li>
									<br>
								{/if}
							{/each}
						</ul>
					{:else if hasDrawnPolygon}
						<Loading withOverlay={false} />
					{:else}
						<strong>Teken een vlak in om data op te halen</strong>
					{/if}
					<!-- {#if distributions && distributions[index]}
						<DonutChart data={distributions[index]} options={donutOptions} style="justify-content:center" />
					{:else}
						<Loading withOverlay={false} />
					{/if} -->
				</div>
				<div class="tag">
					<Tag>{chapter.title}</Tag>
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
		scroll-behavior: smooth;
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

	.chapter-buttons {
		justify-content: center;
		flex-wrap: wrap;
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
		opacity: 0.5;
		box-sizing: border-box;

		background: var(--cds-ui-01);
	}

	.step-heading {
		font-weight: bold;
		padding-bottom: var(--cds-spacing-03);
	}

	.step-heading-sub {
		padding-top: var(--cds-spacing-05);
	}

	.step-stats {
		background-color: var(--cds-ui-01);
	}

	.step--active {
		opacity: 1;
		background: var(--cds-ui-02);
	}

	.tag {
		display: flex;
		justify-content: flex-end;
	}
	
</style>
