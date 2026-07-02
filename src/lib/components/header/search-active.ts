import { writable } from "svelte/store";

/** Whether the header search bar is currently active (expanded). */
export const searchActive = writable<boolean>(false);
