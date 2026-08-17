<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { get } from "svelte/store";
	import { _ } from "svelte-i18n";
	import * as Cesium from "cesium";
	import { Button } from "carbon-components-svelte";
	import { Launch } from "carbon-icons-svelte";
	import type { Story } from "./Story";
	import type { StoryMarkerCollection } from "./story-marker-collection";

	export let story: Story;
	export let collection: StoryMarkerCollection;

	let left = 0;
	let top = 0;
	let display = "none";
	let opacity = 100;
	const windowPosition = new Cesium.Cartesian2();

	onMount(() => {
		collection.map.viewer.clock.onTick.addEventListener(updatePosition);
		collection.map.refresh();
	});

	const hoveredStoryUnsubscriber = collection.hoveredStory.subscribe((hovered) => {
		opacity = hovered === story ? 100 : 0;
	});

	onDestroy(() => {
		collection.map.viewer.clock.onTick.removeEventListener(updatePosition);
		collection.map.refresh();
		hoveredStoryUnsubscriber();
	});

	function updatePosition(): void {
		const cartesianPosition = story.marker?.position?.getValue(
			collection.map.viewer.clock.currentTime,
			new Cesium.Cartesian3()
		);
		if (!cartesianPosition) {
			display = "none";
			return;
		}

		const screenPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
			collection.map.viewer.scene,
			cartesianPosition,
			windowPosition
		);
		if (!screenPosition) {
			display = "none";
			return;
		}

		left = screenPosition.x;
		top = screenPosition.y - 12;
		display = "block";
	}

	function onMouseEnter(event: MouseEvent): void {
		collection.hoveredStory.set(story);
		clearTimeout(collection.hoverBoxTimeOut);
		opacity = 100;
		event.stopPropagation();
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="hoverbox"
	style="left:{left}px; top:{top}px; display:{display}; transform: translate(32px, -100%); opacity: {opacity}%; transition: opacity 0.5s;"
	on:mouseenter={onMouseEnter}
	 on:mouseleave={() => opacity = get(collection.hoveredStory) === story ? 100 : 0}
>
	<div class="hoverbox-header">
		<div class="hoverbox-title">{story.name}</div>
		<div class="hoverbox-buttons">
			<Button
				kind="primary"
				iconDescription={$_("tools.stories.open")}
				icon={Launch}
				tooltipPosition="top"
				size="small"
				on:click={() => collection.dispatch("story-selected", story)}
			/>
		</div>
	</div>
</div>

<style>
	.hoverbox {
		position: absolute;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(10px);
		background-color: #0a1337;
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
</style>