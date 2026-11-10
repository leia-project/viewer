<script lang="ts">
	import ErrorFilled from "carbon-icons-svelte/lib/ErrorFilled.svelte";
	import Gears from "carbon-icons-svelte/lib/Gears.svelte";
	import { marked } from "marked";
	import DOMPurify from "dompurify";

	import type { ChatEvent } from "./chat-types";
	import type { ChatSession } from "./chat-session";
	import { argsPreview } from "./artifact";
	import ResultTable from "./ResultTable.svelte";
	import UiToolStep from "./ui-tools/UiToolStep.svelte";

	/* Eén regel in het gesprek: een vraag, een antwoord, of een tussenstap. */
	export let event: ChatEvent;
	/* Voor de knoppen onder een instructie die op de gebruiker wacht. */
	export let session: ChatSession;

	const renderMarkdown = (text: string) => DOMPurify.sanitize(marked.parse(text, { async: false }));
</script>

{#if event.type === "question"}
	<div class="bubble bubble--user">{event.text}</div>
{:else if event.type === "answer"}
	<div class="bubble bubble--ai">{@html renderMarkdown(event.markdown)}</div>
{:else if event.type === "ui"}
	{@const { toolCallId, toolName } = event}
	<UiToolStep
		summary={event.summary}
		status={event.status}
		detail={event.detail}
		on:apply={() => session.applyUi(toolCallId)}
		on:dismiss={() => session.dismissUi(toolCallId)}
		on:always={() => session.alwaysApplyUi(toolCallId, toolName)}
	/>
{:else if event.type === "call"}
	<div class="step step--call">
		<span class="step__icon"><Gears size={16} /></span>
		<div class="step__main">
			<span class="step__label">{event.tool}</span>
			<pre class="step__code">{argsPreview(event.args)}</pre>
		</div>
	</div>
{:else if event.type === "result"}
	<div class="step step--result">
		<ResultTable content={event.content} />
	</div>
{:else if event.type === "error"}
	<div class="step step--error">
		<span class="step__icon"><ErrorFilled size={16} /></span>
		<div class="step__main">
			{#if event.tool}<span class="step__label">{event.tool}</span>{/if}
			<span class="step__error">{event.error}</span>
		</div>
	</div>
{/if}

<style>
	/* ---- Bubbels: de vraag en het antwoord ---- */

	.bubble {
		max-width: 85%;
		padding: 0.5rem 0.75rem;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	.bubble--user {
		/* Enige element dat rechts uitlijnt; de rest erft `flex-start` van het paneel. */
		align-self: flex-end;
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
	}

	.bubble--ai {
		background: var(--cds-field-01, #ffffff);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		color: var(--cds-text-01, #161616);
	}

	/* ---- Tussenstappen: tool-aanroep, resultaat, fout ---- */

	.step {
		width: 100%;
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid var(--cds-ui-04, #8d8d8d);
		background: var(--cds-field-01, #ffffff);
		font-size: 0.75rem;
		color: var(--cds-text-02, #525252);
	}

	.step--call {
		border-left-color: var(--cds-support-04, #0043ce);
	}

	.step--result {
		flex-direction: column;
		gap: 0.375rem;
		border-left-color: var(--cds-support-02, #24a148);
	}

	.step--error {
		border-left-color: var(--cds-support-01, #da1e28);
		color: var(--cds-support-01, #da1e28);
		background: rgb(218 30 40 / 6%);
	}

	.step__main {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}

	.step__icon {
		display: flex;
		flex-shrink: 0;
	}

	.step__label {
		font-family: var(--cds-code-01-font-family, monospace);
		font-weight: 600;
		color: var(--cds-text-01, #161616);
	}

	.step--error .step__label {
		color: inherit;
	}

	/* Zonder dit duwt een lange SQL-regel het paneel horizontaal open. */
	.step__code {
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.6875rem;
	}

	.step__error {
		overflow-wrap: anywhere;
	}
</style>
