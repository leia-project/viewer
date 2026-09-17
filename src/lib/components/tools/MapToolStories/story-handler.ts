import { writable } from "svelte/store";
import type { Story } from "./Story";

export const selectedStory = writable<Story | undefined>(undefined);
export const showStoryMarkers = writable(true);