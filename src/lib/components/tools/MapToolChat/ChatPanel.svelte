<script lang="ts">
	import { tick } from "svelte";

	import type { Map } from "$lib/map-cesium/map";

	import { createChatSession } from "./chat-session";
	import ChatEvent from "./ChatEvent.svelte";
	import ChatHeader from "./ChatHeader.svelte";
	import ChatInput from "./ChatInput.svelte";
	import ExportDialog from "./ExportDialog.svelte";
	import UiToolSettings from "./ui-tools/UiToolSettings.svelte";

	export let map: Map | undefined;

	/* Het gesprek zelf (agent, instructies, tokens) zit in de sessie; dit paneel toont het. */
	const session = createChatSession(() => map);
	const { events, busy, totalTokens, userKey } = session;

	/* Het keuzemenu voor wat de assistent zonder te vragen mag doen. */
	let settingsOpen = false;

	let exportDialogOpen = false;
	let exporting = false;

	async function exportConversation(event: CustomEvent<string>) {
		exportDialogOpen = false;
		exporting = true;
		try {
			await session.exportConversation(event.detail);
		} catch (error) {
			console.error("Export van gesprek mislukt:", error);
		} finally {
			exporting = false;
		}
	}

	/* Meescrollen met nieuwe berichten en het denkwolkje, na `tick` zodat ze er al staan. */
	let bodyEl: HTMLElement;

	$: if (bodyEl) tick().then(() => scrollToEnd($events, $busy));

	/* Via een lokale `el`: `bodyEl.scrollTop = …` markeert in Svelte 4 `bodyEl` zelf
	   als gewijzigd, waardoor de regel hierboven opnieuw liep: een eindeloze lus. */
	function scrollToEnd(..._changes: unknown[]) {
		const el = bodyEl;
		el.scrollTop = el.scrollHeight;
	}
</script>

<div class="chat-panel">
	<ChatHeader
		totalTokens={$totalTokens}
		exportDisabled={exporting || !$userKey}
		bind:settingsOpen
		on:export={() => (exportDialogOpen = true)}
	/>

	{#if settingsOpen}
		<UiToolSettings />
	{/if}

	<div bind:this={bodyEl} class="chat-panel__body">
		{#each $events as event}
			<ChatEvent {event} {session} />
		{/each}

		{#if $busy}
			<div class="thinking" aria-label="Bezig met nadenken">
				<span></span><span></span><span></span>
			</div>
		{/if}
	</div>

	<ChatInput disabled={$busy} on:submit={(event) => session.ask(event.detail)} />

	{#if exportDialogOpen}
		<ExportDialog on:confirm={exportConversation} on:cancel={() => (exportDialogOpen = false)} />
	{/if}
</div>

<style>
	.chat-panel {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chat-panel__body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	/* Drie puntjes die om de beurt oplichten, in een antwoordbubbel: het "denkwolkje". */
	.thinking {
		display: flex;
		gap: 0.25rem;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: var(--cds-field-01, #ffffff);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
	}

	.thinking span {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: var(--cds-text-03, #a8a8a8);
		animation: blink 1.2s ease-in-out infinite;
	}

	/* Elk puntje start iets later, dus loopt de golf van links naar rechts. */
	.thinking span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.thinking span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes blink {
		0%,
		80%,
		100% {
			opacity: 0.3;
		}
		40% {
			opacity: 1;
		}
	}

	/* Sommige mensen worden misselijk van bewegende UI; het besturingssysteem
	   geeft die voorkeur door via deze media query. */
	@media (prefers-reduced-motion: reduce) {
		.thinking span {
			animation: none;
		}
	}
</style>
