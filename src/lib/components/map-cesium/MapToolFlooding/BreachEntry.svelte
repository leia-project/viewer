<script lang="ts">
	import type { Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import { Button } from "carbon-components-svelte";
	import { OverflowMenuHorizontal, Edit, Save, TrashCan, FetchUpload, ZoomIn, FavoriteFilled, AreaCustom, Location } from "carbon-icons-svelte";
	import * as Cesium from "cesium";

	import { onDestroy, onMount } from "svelte";
	import type { Unsubscriber } from "svelte/motion";
	import type { CesiumIcon } from "../module/cesium-icon";


	export let breach: CesiumIcon;
	export let active: Writable<CesiumIcon | undefined>;
	export let hovered: Writable<CesiumIcon | undefined>;
		
	export let showInfo: boolean = true;


	function entryClick(): void {
		if (breach !== $active) active.set(breach);
		showInfo = true;
	}

	$: hoveredBoolean = $hovered === breach;
	$: activeBoolean = $active === breach;
	$: name = breach.properties.naam;



	let selectedProjectUnsubscriber: Unsubscriber;
	let extentUnsubscriber: Unsubscriber;

	// onMount(() => {
	// 	if (!soilBatch.custom) {
	// 		selectedProjectUnsubscriber = selectedProject.subscribe(() => {
	// 			extentUnsubscriber?.();
	// 			if (!$selectedProject) {
	// 				extentUnsubscriber = cesiumHandler.cesiumMapLayer.extent.subscribe(checkInView);
	// 			} else {
	// 				inView = true;
	// 			}
	// 		});
	// 	}
	// });
	onDestroy(() => {
		selectedProjectUnsubscriber?.();
		extentUnsubscriber?.();
	});


</script>



<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="container" class:active={activeBoolean} on:mouseenter={() => hovered.set(breach)} on:mouseleave={() => hovered.set(undefined)}>
	<div class="entry" on:click={entryClick} class:entry-hovered={hoveredBoolean}>
		<div class="entry-icon">
			<svelte:component this={Location} {...{size: 16, color: 'green'}} />
		</div>
		<div class="entry-body">
			<div>{ name }</div>
		</div>
	</div>
	<slot name="info" />
</div>


<style>
	
	.container {
		border: 1px solid transparent;
		border-radius: 5px;
		cursor: pointer;
		transition: background-color 0.3s;
	}
	.active.container, .container:hover {
		background-color: #e1f1fa; 
	}
	.active.container {
		cursor: default;
	}
	.entry {
		width: 100%;
		border: 1px solid var(--cds-ui-03);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 5px;
		height: 2.5rem;
	}
	.entry-icon {
		padding: 0 var(--cds-spacing-04);
	}
	.entry-body {
		flex-grow: 1;
		white-space: nowrap;
		overflow: hidden;
	}
	

</style>