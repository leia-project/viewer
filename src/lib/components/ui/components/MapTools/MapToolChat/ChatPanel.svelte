<script lang="ts">
	import Bot from "carbon-icons-svelte/lib/Bot.svelte";
	import Close from "carbon-icons-svelte/lib/Close.svelte";
	import ErrorFilled from "carbon-icons-svelte/lib/ErrorFilled.svelte";
	import Gears from "carbon-icons-svelte/lib/Gears.svelte";
	import SendAltFilled from "carbon-icons-svelte/lib/SendAltFilled.svelte";

	import { _ } from "svelte-i18n";

	import type { Writable } from "svelte/store";
	import type { Map } from "$lib/components/map-cesium/module/map";

	import { isChatOpen, closeChat, chatApiUrl } from "./chat-store";
	import { getWfsAttributeNames } from "$lib/components/map-cesium/module/providers/wfs-attributes";

	import { marked } from "marked";
	import  DOMPurify from "dompurify";

	import { get } from "svelte/store"
	import { Config } from "$lib/components/map-core/config/config";
	import { identity } from "@observablehq/plot";

	export let map: Writable<Map | undefined>;

	function renderMarkdown(text: string): string {
		const rawHtml = marked.parse(text, { async: false });
		return DOMPurify.sanitize(
			rawHtml
		)
	}

	let sessionToken = ""; /* Leeg voor nu */

	async function testSession() {
		const response = await fetch(`${$chatApiUrl}/session`)
		const data = await response.json()
		sessionToken = data.session_token
	}

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
		console.log(`Reference layers: `, await webserviceRefs())

		const response = await fetch(`${$chatApiUrl}/query/stream`, {
			method: "POST",
			headers: {
                "Content-Type": "application/json",
				"X-Session-Token": sessionToken
			},
			body: JSON.stringify({
				question,
				webservices_refs: await webserviceRefs()
			})
		})
		
		if (!response.body) return;

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

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

const MAX_ROWS = 15;

function argsPreview(content: unknown): string {
	if (typeof content === "string") return content;
	if (content && typeof content === "object") {
		const values = Object.values(content as Record<string, unknown>);
		if (values.length === 1 && typeof values[0] === "string") return values[0];
		return JSON.stringify(content, null, 2);
	}
	return "";
}

function artifactRows(content: any): Record<string, unknown>[] {
	if (!content || typeof content !== "object") return [];
	if (Array.isArray(content.rows)) return content.rows;
	if (Array.isArray(content.features)) return content.features.map((f: any) => f.properties ?? {});
	if (Array.isArray(content.results)) return content.results;
	return [];
}

function artifactColumns(rows: Record<string, unknown>[]): string[] {
	const columns = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) columns.add(key);
	}
	return [...columns];
}

function artifactCaption(content: any, rowCount: number): string {
	const source = content?.queried_table ?? content?.type_name ?? content?.query ?? null;
	const count = content?.feature_count ?? rowCount;
	return source ? `${count} resultaten · ${source}` : `${count} resultaten`;
}

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "–";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

/* Vertaalt Leia's lagen naar WebserviceLayerRef (backend/app/main.py:36). */
async function webserviceRefs() {
	if (!$map) return [];

	const layers = get($map.layers);

	const refs = layers
		.filter((layer) => ["wfs", "wms"].includes(layer.config.type))
		.map((layer) => ({
			"service_endpoint": layer.config.settings.url,
			/* WMS-lagen hebben geen 'options' */
			"layer_name": 
				layer.config.type === "wms" ? 
				layer.config.settings.featureName :
				layer.config.settings.options?.featureType ?? layer.config.settings.featureType,
			"layer_label": layer.config.title,
			"service_type": layer.config.type,
			"service_version": 
				layer.config.type === "wms" ? 	
				layer.config.settings.version :
				layer.config.settings.options?.version ?? layer.config.settings.version
		}));

	return await Promise.all(refs.map(
		async(ref) => {

		// WMS heeft geen DescribeFeatureType, dus sla over
		if (ref.service_type == "wms") return ref

		if (ref.service_type == "wfs") {
			return {
				...ref,
				attribute_names: await getWfsAttributeNames(
				ref.service_endpoint, // bijv. https://service.pdok.nl/kadaster/brk-bestuurlijke-gebieden/wfs/v1_0?request=GetCapabilities&service=WFS
				ref.layer_name, // bijv. bestuurlijkegebieden:Gemeentegebied
				ref.service_version // bijv. undefined
			)
			}
		}
	}
	))
}

/* Zorg dat het chatvenster meebeweegt */
let bodyEl: HTMLElement;

$: if (events && bodyEl) {
	bodyEl.scrollTop = bodyEl.scrollHeight;
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

		<div bind:this={bodyEl} class="chat-panel__body">
			{#each events as event}
				{#if event.type === "start"}
					<div class="bubble bubble--user">{event.question}</div>

				{:else if event.type === "ai" && event.thinking}
					<div class="step step--call">
						<span class="step__icon"><Gears size={16} /></span>
						<div class="step__main">
							<span class="step__label">{event.tool}</span>
							<pre class="step__code">{argsPreview(event.content)}</pre>
						</div>
					</div>

				{:else if event.type === "ai"}
					<div class="bubble bubble--ai">{@html renderMarkdown(event.content)}</div>

				{:else if event.type === "tool" && event.error}
					<div class="step step--error">
						<span class="step__icon"><ErrorFilled size={16} /></span>
						<div class="step__main">
							<span class="step__label">{event.tool}</span>
							<span class="step__error">{event.error}</span>
						</div>
					</div>

				{:else if event.type === "tool"}
					{@const rows = artifactRows(event.content)}
					{@const columns = artifactColumns(rows)}
					<div class="step step--result">
						<span class="step__caption">{artifactCaption(event.content, rows.length)}</span>
						{#if rows.length === 0}
							<span class="step__empty">Geen resultaten.</span>
						{:else}
							<div class="step__scroll">
								<table class="data-table">
									<thead>
										<tr>
											{#each columns as column}
												<th>{column}</th>
											{/each}
										</tr>
									</thead>
									<tbody>
										{#each rows.slice(0, MAX_ROWS) as row}
											<tr>
												{#each columns as column}
													<td>{formatCell(row[column])}</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
							{#if rows.length > MAX_ROWS}
								<span class="step__caption">+ {rows.length - MAX_ROWS} meer</span>
							{/if}
						{/if}
					</div>

				{:else if event.type === "error"}
					<div class="step step--error">
						<span class="step__icon"><ErrorFilled size={16} /></span>
						<span class="step__error">{event.error}</span>
					</div>
				{/if}
			{/each}

			{#if busy}
				<div class="bubble bubble--ai bubble--thinking" aria-label="Bezig met nadenken">
					<span></span><span></span><span></span>
				</div>
			{/if}
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
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.8125rem;
		line-height: 1.4;
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

	/* ---- Bubbels: de vraag en het antwoord ---- */

	.bubble {
		max-width: 85%;
		padding: 0.5rem 0.75rem;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	.bubble--user {
		/* Enige element dat rechts uitlijnt; de rest erft `flex-start` van de body. */
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

	.step__caption,
	.step__empty {
		color: var(--cds-text-03, #a8a8a8);
	}

	.step__empty {
		font-style: italic;
	}

	/* ---- Datatabel ---- */

	/* De tabel mag zelf breder worden dan het paneel; dit blok schuift mee
	   in plaats van de layout op te rekken. */
	.step__scroll {
		overflow-x: auto;
		max-width: 100%;
	}

	.data-table {
		border-collapse: collapse;
		font-size: 0.6875rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.25rem 0.5rem;
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	.data-table th {
		font-weight: 600;
		color: var(--cds-text-01, #161616);
		border-bottom: 1px solid var(--cds-ui-04, #8d8d8d);
	}

	.data-table td {
		border-bottom: 1px solid var(--cds-ui-03, #e0e0e0);
	}

	.data-table tbody tr:last-child td {
		border-bottom: none;
	}

	/* ---- Animaties ---- */

	/* Drie puntjes die om de beurt oplichten: het "denkwolkje". */
	.bubble--thinking {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.bubble--thinking span {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: var(--cds-text-03, #a8a8a8);
		animation: blink 1.2s ease-in-out infinite;
	}

	/* Elk puntje start iets later, dus loopt de golf van links naar rechts. */
	.bubble--thinking span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.bubble--thinking span:nth-child(3) {
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
		.bubble--thinking span {
			animation: none;
		}
	}
</style>
