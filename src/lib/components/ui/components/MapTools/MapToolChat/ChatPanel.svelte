<script lang="ts">
	import Bot from "carbon-icons-svelte/lib/Bot.svelte";
	import Close from "carbon-icons-svelte/lib/Close.svelte";
	import SendAltFilled from "carbon-icons-svelte/lib/SendAltFilled.svelte";

	import { _ } from "svelte-i18n";

	import { isChatOpen, closeChat, chatApiUrl } from "./chat-store";

	let sessionToken = ""; /* Leeg voor nu */

	async function testSession() {
		const response = await fetch(`${$chatApiUrl}/session`)
		const data = await response.json()
		sessionToken = data.session_token
	}

	/* Rauwe content teruggegeven van LLM */
	let raw = "";

	/* Checkt of de agent al aan het denken is... */
	let busy = false; 

	/* De prompt van de gebruiker */
	let question = "";

	/* Houdt buffer van chunks bij */
	let events: any[] = [];
	let buffer = "";

	async function ask() {
		if (busy) {
			return
		}

		/* Aan de slag! */
		busy = true;

		try {
		if (!sessionToken) await testSession();
		console.log(`Chat API URL: `, $chatApiUrl);

		const response = await fetch(`${$chatApiUrl}/query/stream`, {
			method: "POST",
			headers: {
                "Content-Type": "application/json",
				"X-Session-Token": sessionToken
			},
			body: JSON.stringify({
				question
			})
		})

		console.log(`Response status: ${response.status}`)
		
		if (!response.body) return;

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		raw = "";

		while (true) {
			const { value, done } = await reader.read();
			if (done == true) {
				break
			}
			buffer += decoder.decode(value, { stream: true });

			const parts = buffer.split("\n\n");

			console.log("buffer:", buffer.length);


			/* Haal het laatste stukje weg en stop het in buffer voor volgende iteratie */
			buffer = parts.pop() ?? ""

			for (const part of parts) {
				if (!part.startsWith("data: ")) continue;
				events = [...events, JSON.parse(part.slice(6))];
			}
		}
	} finally {
		busy = false 
	}
}

/* Stuur ook een bericht met Ctrl+Enter */
function handleKeydown(event: KeyboardEvent) {
	if (event.code === "Enter" && event.ctrlKey == true) {
		ask()
	}
}
</script>

{#if $isChatOpen}
	<div class="chat-panel">
		<header class="chat-panel__header">
			<div class="chat-panel__title">
				<Bot size={20} />
				<span>
					{$_("tools.chat.label")}
				</span>
			</div>

			<button on:click={closeChat} class="chat-panel__close" type="button" aria-label="Close chat">
				<Close size={20} />
			</button>
		</header>

		<div class="chat-panel__body">
			<pre class="chat-panel__raw">{JSON.stringify(events, null, 2)}</pre>
		</div>

		<div class="chat-panel__footer">
			<input
				class="chat-panel__input"
				bind:value={question}
				placeholder="Stel een vraag"
				disabled={busy}
				on:keydown={handleKeydown}
			/>
			<button
				class="chat-panel__send"
				on:click={ask}
				type="button"
				disabled={busy}
				aria-label="Verstuur vraag"
			>
				<SendAltFilled size={20} />
			</button>
		</div>
	</div>
{/if}

<style>
	.chat-panel {
		position: absolute;
		/* Clears the MapControls row (3rem) and the chat toggle (6rem) stacked
		   above it, so opening the chat never covers the button that opened it. */
		bottom: calc(3rem + 6rem + var(--cds-spacing-05) * 3);
		right: var(--cds-spacing-05);
		width: 24rem;
		height: 31.25rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--cds-ui-01, #f4f4f4);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		box-shadow: 0 2px 12px rgb(0 0 0 / 25%);
		z-index: 10;
	}

	.chat-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
	}

	.chat-panel__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.chat-panel__model {
		opacity: 0.7;
		font-size: 0.75rem;
	}

	.chat-panel__close {
		display: flex;
		align-items: center;
		padding: 0.25rem;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.chat-panel__close:hover {
		background: rgb(255 255 255 / 15%);
	}

	.chat-panel__body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.chat-panel__footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-top: 1px solid var(--cds-ui-03, #e0e0e0);
		padding: 1rem;
	}

	.chat-panel__input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem;
		border: 1px solid var(--cds-ui-04, #8d8d8d);
		background: var(--cds-field-01, #ffffff);
		color: inherit;
		font: inherit;
	}

	.chat-panel__send {
		display: flex;
		align-items: center;
		padding: 0.5rem;
		border: none;
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
		cursor: pointer;
	}

	/* Eén regel dekt beide: zolang `busy` waar is staan input en knop uit. */
	.chat-panel__input:disabled,
	.chat-panel__send:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Een <pre> breekt standaard geen regels af; zonder dit duwt de stream
	   het paneel horizontaal open. */
	.chat-panel__raw {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 0.75rem;
		color: var(--cds-text-02, #525252);
	}
</style>
