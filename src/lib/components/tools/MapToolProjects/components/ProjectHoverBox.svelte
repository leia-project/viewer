<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { get } from "svelte/store";
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { Button } from "carbon-components-svelte";
	import { Launch } from "carbon-icons-svelte";
	import type { CesiumProject } from "../classes/project";
	import type { ProjectCollection } from "../classes/project-collection";

	export let project: CesiumProject;
	export let collection: ProjectCollection;

	let cartesianPosition = Cesium.Cartesian3.fromDegrees(project.center[0], project.center[1], 50);

	onMount(() => {
		project.map.viewer.clock.onTick.addEventListener(updatePosition);
		if (project.marker.billboard) project.marker.billboard.color = new Cesium.ConstantProperty(Cesium.Color.fromCssColorString("#68b6f7"));
		collection.map.refresh();
	});
	onDestroy(() => {
		project.map.viewer.clock.onTick.removeEventListener(updatePosition);
		if (hoveredMapItemUnsubscriber) hoveredMapItemUnsubscriber();
		if (project.marker.billboard) project.marker.billboard.color = new Cesium.ConstantProperty(Cesium.Color.WHITE);
		collection.map.refresh();
	});

	
	let left: number = 0;
	let top: number = 0;
	let bottom: number = 0;
	let display: string = "none";
	let windowPosition = new Cesium.Cartesian2();
	function updatePosition() {
		if (cartesianPosition) Cesium.SceneTransforms.worldToWindowCoordinates(project.map.viewer.scene, cartesianPosition, windowPosition);
		if (windowPosition) {
			left = windowPosition.x;
			top = windowPosition.y - 3;
			bottom = window.innerHeight - windowPosition.y - 6;
			if (display === 'none') display = 'block';
			
		}
		else if (display === 'block') display = 'none';
	}
	$: verticalPosition =  `top:${top}px`;
	//$: verticalPosition = object instanceof Depot ? `bottom:${bottom}px` : `top:${top}px`;

	let xOffset: number =  24;

	let opacity: number = 100;

	function onMouseEnter(event: MouseEvent): void {
		if (get(collection.hoveredProject) !== project) collection.hoveredProject.set(project);
		clearTimeout(collection.hoverBoxTimeOut);
		opacity = 100;
		event.stopPropagation();
	}

	const hoveredMapItemUnsubscriber = collection.hoveredProject.subscribe((hovered) => {
		opacity = hovered === project ? 100 : 0;
	});

	let expanded: boolean = false;

</script>


<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="hoverbox" style="left:{left}px; {verticalPosition}; display:{display}; transform: translate({xOffset}px, -100%); opacity: {opacity}%; transition: opacity 0.5s;"
	on:mouseenter={(e) => onMouseEnter(e)}
	on:mouseleave={() => opacity = get(collection.hoveredProject) === project ? 100 : 0}
>
	<div class="hoverbox-header">
		<div class="hoverbox-title">{project.projectConfig.name}</div>
		<div class="hoverbox-buttons">
			<Button 
				kind="primary"
				iconDescription={$_("tools.projects.open")}
				icon={Launch}
				tooltipPosition="top"
				size="small"
				on:click={() => collection.dispatch("project-selected", project)}
			/>
			<!--
			<Button 
				kind="primary"
				iconDescription="Uitklappen"
				icon={CaretDown}
				tooltipPosition="right"
				size="small"
				on:click={() => expanded = !expanded}
			/>
			-->
		</div>
	</div>
	<div class="hoverbox-content" class:expanded={expanded}>
		<div class="info-circle">i</div>
		<div>{$_("tools.projects.viewDetails")}</div>
	</div>
</div>


<style>

	.hoverbox {
		position: absolute;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(10px);
		background-color: #0A1337;
		min-width: 250px;
		color: #b3d9ff;
		cursor: default;
	}

	.hoverbox-header {
		display: flex;
		justify-content: space-between;
		column-gap: 1rem;
		align-items: center;
		padding-left: 8px;
		border-bottom: 1px solid var(--cds-color-ui-03);
	}

	.hoverbox-title {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.hoverbox-buttons {
		display: flex;
		column-gap: 0;
	}

	.hoverbox-content {
		padding: 10px;
		display: none;
		position: absolute;
		top: 100%;
		left: 0;
		width: 100%;
		background-color: #0A1337;
	}

	.hoverbox-content.expanded {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
	}

	.info-circle  {
		width: 1rem;
		height: 1rem;
		border: 1px solid #68b6f7;
		border-radius: 50%;
		color: #68b6f7;
		display: flex;
		justify-content: center;
		align-items: center;
	}

</style>