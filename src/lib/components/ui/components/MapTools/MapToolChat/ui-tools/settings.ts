import { writable } from "svelte/store";

import { appStorage } from "$lib/components/localization/app-storage";

import type { ApprovalMode } from "./types";

/* Wat de gebruiker zelf heeft gekozen per instructie; een tool zonder keuze gebruikt
   zijn eigen standaard. Bewaard in localStorage. */
export const uiToolApproval = writable<Record<string, ApprovalMode>>({});

appStorage.register<Record<string, ApprovalMode>>(uiToolApproval, "chat.uiToolApproval", {});

export function setApproval(toolName: string, mode: ApprovalMode): void {
	uiToolApproval.update((current) => ({ ...current, [toolName]: mode }));
}
