<script lang="ts">
	import { getContext } from "svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";

	import type { Map } from "../module/map";

	import Catalog from "carbon-icons-svelte/lib/Catalog.svelte";
	import { StoryStep } from "./StoryStep";
	import { CameraLocation } from "$lib/components/map-core/camera-location";
	import { Story } from "./Story";

	import StoryView from "./StoryView.svelte";
	import { StoryLayer } from "./StoryLayer";

	import { page } from "$app/stores";
	import { StoryChapter } from "./StoryChapter";
	
	
	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	let id: string = "stories";
	export let icon: any = Catalog;
	export let label: string = "Stories";
	export let textBack: string = "Back to overview";
	export let textStepBack: string = "Step backward";
	export let textStepForward: string = "Step forward";
	let cesiumMap = map as Map;

	let stories = new Array<Story>();
	let selectedStory: Story | undefined;
	let stepNumber: number;

	let tool = new MapToolMenuOption(id, icon, label);

	$: { tool.label.set(label); }
	registerTool(tool);

	$: {
		tool.width.set(selectedStory?.width ?? "");
	}
	selectedTool.subscribe((selected: MapToolMenuOption) => {
		if (tool === selected && selectedStory) {
			tool.width.set(selectedStory.width ?? "");
		}
	});

	tool.settings.subscribe((settings) => {
		if (settings) {
			loadStoriesFromSettings(settings);

			// Directly activate story from searchParams
			const queriedStory = $page.data.story;
			if(!queriedStory) return;
			for (let i = 0; i < stories.length; i++) {
				if (stories[i].name.toLowerCase() === queriedStory.toLowerCase()) {
					$selectedTool = tool;
					activateStory(stories[i]);
					return;
				}
			}
		}
	});


	function loadStoriesFromSettings(settings: any) {
		const configStories = settings.stories;
		const loadedStories = new Array<Story>();

		if (configStories) {
			// Load all stories
			for (let i = 0; i < configStories.length; i++) {
				const story = configStories[i];
				const storyName = story.name;
				const storyDescription = story.description;
				const storyWidth = story.width;
				const storyChapters = new Array<StoryChapter>();

				// Load all chapter groups
				const chapterGroups = story.chapterGroups;

				// Load all chapters
				for (let j = 0; j < story.chapters.length; j++) {
					const chapter = story.chapters[j];
					const chapterGroup = chapterGroups.find((chapterGroup: any) => chapter.id === chapterGroup.id);
					const chapterTitle: string = chapterGroup.title;
					const chapterButtonText: string = chapterGroup.buttonText;
					const storySteps = new Array<StoryStep>();
					
					// Load all chapter steps
					for (let k = 0; k < chapter.steps.length; k++) {
						const step = chapter.steps[k];
						const cl = new CameraLocation(
							step.camera["x"],
							step.camera["y"],
							step.camera["z"],
							step.camera["heading"],
							step.camera["pitch"],
							step.camera["duration"]
						);

						// Load all story layers
						const storyLayers = new Array<StoryLayer>();
						for (let l = 0; l < step.layers.length; l++) {
							storyLayers.push(
								new StoryLayer(step.layers[l].id, step.layers[l].opacity, step.layers[l].style)
							);
						}
						const globeOpacity = step.globeOpacity ?? 100;

						storySteps.push(new StoryStep(step.title, step.html, cl, storyLayers, globeOpacity, step.terrain, step.customComponent));
					}
					storyChapters.push(new StoryChapter(chapter.id, chapterTitle, chapterButtonText, storySteps));
				}
				loadedStories.push(new Story(storyName, storyDescription, storyChapters, storyWidth));
			}
		}
		stories = loadedStories;
	}

	function activateStory(story: Story) {
		stepNumber = 1;
		selectedStory = story;
	}

	function closeStory() {
		selectedStory = undefined;
		tool.width.set("");
	}

	function closeModule(e: any) {
		stepNumber = e.detail.n;
	}

</script>

{#if $selectedTool === tool}
	<div class="wrapper">
		{#if selectedStory}
			<StoryView
				map={cesiumMap}
				story={selectedStory}
				{textBack}
				{textStepBack}
				{textStepForward}
				savedStepNumber={stepNumber}
				on:closeStory={() => {
					closeStory();
				}}
				on:closeModule={(e) => {
					closeModule(e);
				}}
			/>
		{:else}
			{#each stories as story}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div
					class="story"
					on:click={() => {
						activateStory(story);
					}}
					role="button"
					tabindex="0"
				>
					<div class="heading-02">
						{story.name}
					</div>
					{#if story.description}
						<div class="label-01">
							{story.description}
						</div>
					{/if}
				</div>
				<div class="divider"> </div>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.wrapper {
		width: 100%;
		box-sizing: border-box;
	}

	.story {
		padding: var(--cds-spacing-05);
	}

	.story:hover {
		background-color: var(--cds-ui-01);
		color: var(--tosti-color-text-secondary);
		transition: 0.2s;
		cursor: pointer;
	}

	.divider {
        background-color: var(--cds-ui-03);
        width: 100%;
        height: 1px;
    }
</style>
