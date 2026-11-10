import { writable } from "svelte/store";

export const chatApiUrl = writable<string | undefined>(undefined);
