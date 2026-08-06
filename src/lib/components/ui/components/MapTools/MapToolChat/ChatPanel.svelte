<script lang="ts">
	import Chat from "carbon-icons-svelte/lib/Chat.svelte";
	import Close from "carbon-icons-svelte/lib/Close.svelte";
	import Question from "carbon-icons-svelte/lib/QuestionAnswering.svelte"

	import { _ } from "svelte-i18n";

	import { isChatOpen, closeChat } from "./chat-store";

	export let LLMModelName: string | null = null;
</script>

{#if $isChatOpen}

<div class="chat-panel">
	<header class="chat-panel__header">
		<div class="chat-panel__title">
			<Chat size={20} />
			<span>
				{$_("tools.chat.label")}
				{#if LLMModelName}
					<span class="chat-panel__model">({LLMModelName})</span>
				{/if}
			</span>
		</div>

		<button on:click={closeChat} class="chat-panel__close" type="button" aria-label="Close chat">
			<Close size={20} />
		</button>
	</header>

	<div class="chat-panel__body">
		<p class="chat-panel__placeholder">Messages will live here.</p>
	</div>

	<div class="chat-panel__footer">
		<p class="chat-panel__placeholder">Input will live here.</p>
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
		border-top: 1px solid var(--cds-ui-03, #e0e0e0);
		padding: 1rem;
	}

	.chat-panel__placeholder {
		color: var(--cds-text-02, #525252);
		font-size: 0.875rem;
	}
</style>