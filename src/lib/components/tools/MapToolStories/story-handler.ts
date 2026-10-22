import { writable } from "svelte/store";
import type { Story } from "./Story";
import type { StoryStep } from "./StoryStep";

export const selectedStory = writable<Story | undefined>(undefined);
export const showStoryMarkers = writable(true);
// The step currently shown in the open story, used for step-bound marker visibility.
export const activeStoryStep = writable<StoryStep | undefined>(undefined);