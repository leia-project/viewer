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
	<div class="bubble bubble--ai markdown">{@html renderMarkdown(event.markdown)}</div>
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
		max-width: 90%;
		padding: 0.5rem 0.75rem;
		overflow-wrap: anywhere;
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

	/* ---- Markdown in een antwoord ----
	   Via {@html} ingevoegd, dus zonder Svelte-scope: daarom :global, maar alleen
	   binnen .markdown. De globale reset haalt lijsttekens en marges weg en laat koppen
	   groot; hier krijgt alles een compacte opmaak die bij de paneeltekst past. */

	.markdown {
		line-height: 1.45;
	}

	.markdown :global(:is(p, ul, ol, pre, blockquote, table)) {
		margin: 0 0 0.5rem;
	}

	.markdown :global(:is(h1, h2, h3, h4, h5, h6)) {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.3;
		color: inherit;
		/* Een globale regel centreert h1. */
		text-align: left;
	}

	.markdown :global(h1) {
		font-size: 0.9375rem;
	}

	/* Geen witruimte boven het eerste en onder het laatste blok van de bubbel. */
	.markdown :global(> :first-child) {
		margin-top: 0;
	}

	.markdown :global(> :last-child) {
		margin-bottom: 0;
	}

	.markdown :global(p) {
		font-size: inherit;
		line-height: inherit;
		color: inherit;
	}

	.markdown :global(:is(ul, ol)) {
		padding-left: 1.25rem;
	}

	.markdown :global(ul) {
		list-style: disc;
	}

	.markdown :global(ol) {
		list-style: decimal;
	}

	.markdown :global(ul ul) {
		list-style: circle;
	}

	/* Een geneste lijst staat direct onder zijn punt. */
	.markdown :global(li :is(ul, ol)) {
		margin: 0.125rem 0 0;
	}

	.markdown :global(li + li) {
		margin-top: 0.125rem;
	}

	.markdown :global(:is(strong, b)) {
		font-weight: 600;
	}

	.markdown :global(em) {
		font-style: italic;
	}

	.markdown :global(a) {
		color: var(--cds-link-01, #0f62fe);
		text-decoration: underline;
	}

	.markdown :global(code) {
		padding: 0 0.25rem;
		background: var(--cds-ui-01, #f4f4f4);
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
	}

	.markdown :global(pre) {
		padding: 0.5rem;
		overflow-x: auto;
		background: var(--cds-ui-01, #f4f4f4);
	}

	.markdown :global(pre code) {
		padding: 0;
		background: none;
	}

	.markdown :global(blockquote) {
		padding-left: 0.5rem;
		border-left: 3px solid var(--cds-ui-04, #8d8d8d);
		color: var(--cds-text-02, #525252);
	}

	.markdown :global(hr) {
		margin: 0.5rem 0;
		border: 0;
		border-top: 1px solid var(--cds-ui-03, #e0e0e0);
	}

	/* Een brede tabel schuift binnen de bubbel in plaats van het paneel op te rekken. */
	.markdown :global(table) {
		display: block;
		max-width: 100%;
		overflow-x: auto;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.markdown :global(:is(th, td)) {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		text-align: left;
		vertical-align: top;
		/* De bubbel breekt overal af; in een cel brak dat woorden ("Locati-e"). De tabel
		   scrolt al, dus hier alleen op spaties afbreken. */
		overflow-wrap: normal;
	}

	.markdown :global(th) {
		font-weight: 600;
		background: var(--cds-ui-01, #f4f4f4);
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
