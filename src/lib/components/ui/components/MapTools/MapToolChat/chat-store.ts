import { writable } from "svelte/store";

export const isChatOpen = writable(false)

export const chatApiUrl = writable<string | undefined>(undefined);

export function openChat(): void {
	isChatOpen.set(true)
}

export function closeChat(): void {
	isChatOpen.set(false)
}

export function toggleChat(): void {
	isChatOpen.update(current => !current)
}
