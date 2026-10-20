<script lang="ts">
	import Bot from "carbon-icons-svelte/lib/Bot.svelte";
	import Close from "carbon-icons-svelte/lib/Close.svelte";
	import Download from "carbon-icons-svelte/lib/Download.svelte";
	import ErrorFilled from "carbon-icons-svelte/lib/ErrorFilled.svelte";
	import Gears from "carbon-icons-svelte/lib/Gears.svelte";
	import SendAltFilled from "carbon-icons-svelte/lib/SendAltFilled.svelte";
	import SettingsIcon from "carbon-icons-svelte/lib/Settings.svelte";

	import { _, locale } from "svelte-i18n";

	import { HttpAgent } from "@ag-ui/client";
	import type { AgentSubscriber } from "@ag-ui/client";

	import type { Writable } from "svelte/store";
	import type { Map } from "$lib/components/map-cesium/module/map";

	import { isChatOpen, closeChat, chatApiUrl } from "./chat-store";
	import { exportConversation } from "./conversation-export";
	import { getWfsAttributeNames } from "$lib/components/map-cesium/module/providers/wfs-attributes";
	import { getUiTool, toAgUiTools } from "./ui-tools/tools";
	import { labelLayers, layerProperties, newId } from "./ui-tools/layers";
	import { uiToolApproval, setApproval } from "./ui-tools/settings";
	import UiToolStep from "./ui-tools/UiToolStep.svelte";
	import UiToolSettings from "./ui-tools/UiToolSettings.svelte";
	import type { UiTool } from "./ui-tools/types";

	import { marked } from "marked";
	import  DOMPurify from "dompurify";

	import { get } from "svelte/store"
	import { tick } from "svelte";

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

	// Checkt of de agent al aan het denken is... //
	let busy = false;

	/* Haalt de volledige agent-state van dit gesprek op als JSON-bestand.
	   Zonder sessietoken is er nog geen draad om te exporteren. */
	let exporting = false;

	/* Het keuzemenu voor wat de assistent zonder te vragen mag doen. */
	let settingsOpen = false;

	/* De exportknop downloadt niet meteen, maar vraagt eerst waarom je exporteert.
	   Die reden belandt in het bestand, zodat een map met exports vanzelf een
	   lijst met klachten wordt. */
	let exportDialogOpen = false;
	let exportReason = "";

	function openExportDialog() {
		if (exporting || !sessionToken) return;
		exportReason = "";
		exportDialogOpen = true;
	}

	function cancelExport() {
		exportDialogOpen = false;
	}

	/* Een Svelte-action: deze functie krijgt het element zodra het in de DOM
	   komt, zodat de cursor meteen in het invoerveld staat. */
	function focusOnMount(node: HTMLElement) {
		node.focus();
	}

	function handleExportKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") cancelExport();
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) handleExport();
	}

	async function handleExport() {
		if (exporting || !sessionToken || !$chatApiUrl) return;

		exporting = true;
		exportDialogOpen = false;
		try {
			await exportConversation($chatApiUrl, sessionToken, conversationId, exportReason.trim());
		} catch (error) {
			console.error("Export van gesprek mislukt:", error);
		} finally {
			exporting = false;
		}
	}

	// De prompt van de gebruiker //
	let question = "";

	// Model en provider 
	let modelName: string | null = null;
	let providerName: string | null = null;

	async function fetchConfig() {
		const response = await fetch(`${$chatApiUrl}/config`)
		const data = await response.json()

		modelName = data.llm_model;
		providerName = data.llm_provider;
	}

	$: if ($chatApiUrl) fetchConfig()

	const PROVIDER_LABELS: Record<string, string> = {
		openrouter: "OpenRouter",
		ollama: "Ollama (lokaal)",
		anthropic: "Anthropic"
	};

	function providerLabel(provider: string | null): string {
		return provider ? PROVIDER_LABELS[provider] ?? provider : "";
	}

	/* De backend raadt de taal niet zelf (dat kost tokens en ging vaak mis),
	   maar gebruikt wat wij meesturen: de taal van de interface. Een locale kan
	   "nl-NL" zijn, dus alleen het deel voor het streepje telt. Zonder locale
	   "en", net als de backend. Een taal buiten en/nl krijgt daar een nette
	   melding dat hij niet ondersteund wordt. */
	function requestLanguage(current: string | null | undefined): string {
		return current?.split("-")[0] ?? "en";
	}

	/* De gespreksdraad van deze pagina. Hij sterft met de pagina: herladen begint een
	   nieuw gesprek. De backend maakt er samen met het sessietoken de draad-id van. */
	const conversationId = newId();

	/* Wat het paneel toont: de vraag, de antwoorden, de tool-aanroepen en -resultaten,
	   en de instructies van de assistent aan de viewer. */
	let events: any[] = [];

	/* De AG-UI-client houdt het gesprek bij (en stuurt het bij elke vraag opnieuw mee). */
	let agent: HttpAgent | undefined;

	/* tool_call_id -> toolnaam, om een resultaat bij zijn tool te tonen. */
	const toolNames: Record<string, string> = {};

	interface UiCall {
		tool: UiTool<unknown>;
		args: unknown;
	}

	/* Instructies die op de keuze van de gebruiker wachten. */
	const awaiting: Record<string, UiCall> = {};

	/* Uitkomsten van instructies die de agent nog niet heeft gehoord. Ze gaan vlak voor
	   de volgende vraag mee, ervoor: dat is de volgorde die de backend verwacht. */
	let pendingResults: { toolCallId: string; content: string; error?: string }[] = [];

	/* Instructies worden één voor één uitgevoerd, in de volgorde van de agent. */
	let execution: Promise<void> = Promise.resolve();

	const DECLINED = "The user declined this instruction.";

	function patchUi(toolCallId: string, patch: Record<string, unknown>) {
		events = events.map((e) => (e.type === "ui" && e.toolCallId === toolCallId ? { ...e, ...patch } : e));
	}

	function finishUi(toolCallId: string, status: string, detail: string, error?: string) {
		patchUi(toolCallId, { status, detail });
		pendingResults.push({ toolCallId, content: detail, error });
	}

	function runUi(toolCallId: string, call: UiCall) {
		patchUi(toolCallId, { status: "running" });
		execution = execution.then(async () => {
			try {
				const current = get(map);
				if (!current) throw new Error("De kaart is niet beschikbaar.");
				if (!$chatApiUrl) throw new Error("De backend-URL is niet bekend.");
				finishUi(
					toolCallId,
					"applied",
					await call.tool.execute(call.args, { map: current, apiUrl: $chatApiUrl, sessionToken })
				);
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				finishUi(toolCallId, "failed", detail, detail);
			}
			/* Laat Svelte de wijziging (bijv. de nieuwe laag) verwerken voor de volgende instructie. */
			await tick();
		});
	}

	function handleUiCall(toolCallId: string, toolName: string, rawArgs: unknown) {
		const tool = getUiTool(toolName)!;
		let args: unknown;
		try {
			args = tool.parse(rawArgs);
		} catch (error) {
			/* De agent hoort waarom en kan het bij de volgende vraag opnieuw proberen. */
			const detail = error instanceof Error ? error.message : String(error);
			events = [...events, { type: "ui", toolCallId, toolName, summary: toolName, status: "failed", detail }];
			pendingResults.push({ toolCallId, content: detail, error: detail });
			return;
		}

		const mode = $uiToolApproval[toolName] ?? tool.defaultApproval;
		const call: UiCall = { tool, args };
		events = [
			...events,
			{ type: "ui", toolCallId, toolName, summary: tool.describe(args), status: mode === "auto" ? "running" : "awaiting" }
		];
		if (mode === "auto") {
			runUi(toolCallId, call);
		} else {
			awaiting[toolCallId] = call;
		}
	}

	function applyUi(toolCallId: string) {
		const call = awaiting[toolCallId];
		if (!call) return;
		delete awaiting[toolCallId];
		runUi(toolCallId, call);
	}

	function dismissUi(toolCallId: string) {
		if (!awaiting[toolCallId]) return;
		delete awaiting[toolCallId];
		finishUi(toolCallId, "dismissed", DECLINED);
	}

	function alwaysApplyUi(toolCallId: string, toolName: string) {
		setApproval(toolName, "auto");
		applyUi(toolCallId);
	}

	/* De AG-UI-events vertaald naar wat het paneel al kon tonen. */
	const subscriber: AgentSubscriber = {
		onTextMessageEndEvent: ({ textMessageBuffer }) => {
			if (textMessageBuffer.trim()) {
				events = [...events, { type: "ai", thinking: false, content: textMessageBuffer }];
			}
		},

		onToolCallStartEvent: ({ event }) => {
			toolNames[event.toolCallId] = event.toolCallName;
		},

		onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
			if (getUiTool(toolCallName)) {
				handleUiCall(event.toolCallId, toolCallName, toolCallArgs);
			} else {
				events = [...events, { type: "ai", thinking: true, tool: toolCallName, content: toolCallArgs }];
			}
		},

		onToolCallResultEvent: ({ event }) => {
			const tool = toolNames[event.toolCallId] ?? null;
			if (event.metadata?.error) {
				events = [...events, { type: "tool", tool, error: String(event.content) }];
				return;
			}
			let content: unknown = event.content;
			if (typeof content === "string") {
				try {
					content = JSON.parse(content);
				} catch {
					/* een gewone tekst: laten zoals hij is */
				}
			}
			events = [...events, { type: "tool", tool, content }];
		},

		onRunErrorEvent: ({ event }) => {
			events = [...events, { type: "error", error: event.message }];
		},

		onRunFailed: ({ error }) => {
			console.error("Agent-run mislukt:", error);
			events = [...events, { type: "error", error: "Geen verbinding met de assistent." }];
		}
	};

	async function ask() {
		if (busy) {
			return
		}

		/* Aan de slag! */
		busy = true;

		/* Het invoerveld hangt via bind:value aan `question`, dus legen doe je
		   door de variabele leeg te maken. De vraag zelf gaat eerst in een
		   kopie, anders versturen we de inmiddels lege string. */
		const asked = question;
		question = "";

		try {
		if (!sessionToken) await testSession();
		console.log(`Chat API URL: `, $chatApiUrl);

		const refs = await webserviceRefs();
		console.log(`Reference layers: `, refs);

		if (!agent) {
			agent = new HttpAgent({ url: `${$chatApiUrl}/agent/run`, threadId: conversationId });
		}
		agent.headers = { "X-Session-Token": sessionToken };

		/* Instructies waarop de gebruiker niet meer heeft gereageerd, vervallen; de
		   backend vult zelf een "geen resultaat" in voor de agent. */
		for (const toolCallId of Object.keys(awaiting)) {
			patchUi(toolCallId, { status: "expired" });
			delete awaiting[toolCallId];
		}

		/* Eerst wat er met eerdere instructies is gebeurd, dan de nieuwe vraag. */
		for (const result of pendingResults) {
			agent.addMessage({ id: newId(), role: "tool", toolCallId: result.toolCallId, content: result.content, error: result.error });
		}
		pendingResults = [];
		agent.addMessage({ id: newId(), role: "user", content: asked });

		/* De agent kent de lagen op de kaart alleen hieruit: `layers` zijn de
		   webservices die hij kan bevragen, `map_layers` alles waar hij op kan werken,
		   onder de namen die de tools accepteren. */
		const current = get(map);
		agent.state = {
			layers: refs,
			map_layers: labelLayers(current ? get(current.layers) : []).map(({ label, layer }) => ({
				name: label,
				type: layer.config.type,
				properties: layerProperties(layer)
			}))
		};

		events = [...events, { type: "start", question: asked }];

		try {
			await agent.runAgent(
				{ tools: toAgUiTools(current), forwardedProps: { language: requestLanguage($locale) } },
				subscriber
			);
		} catch {
			/* al gemeld via onRunFailed */
		}
	} finally {
		busy = false 
	}
}

/* Stuur ook een bericht met Ctrl+Enter */
/* Enter verstuurt, Ctrl/Cmd+Enter en Shift+Enter maken een nieuwe regel.
   Shift+Enter doet de browser zelf; Ctrl+Enter doet in een textarea niets,
   dus die regel zetten we hieronder met de hand op de cursorpositie. */
function handleKeydown(event: KeyboardEvent) {
	if (event.key !== "Enter") return;

	if (event.shiftKey) return;

	if (event.ctrlKey || event.metaKey) {
		event.preventDefault();
		insertNewline(event.currentTarget as HTMLTextAreaElement);
		return;
	}

	/* Zonder dit zet de browser alsnog een regeleinde in het veld. */
	event.preventDefault();
	ask();
}

async function insertNewline(el: HTMLTextAreaElement) {
	const start = el.selectionStart;
	const end = el.selectionEnd;

	question = question.slice(0, start) + "\n" + question.slice(end);

	/* `tick` wacht tot Svelte de nieuwe waarde in de DOM heeft gezet; pas
	   daarna kun je de cursor achter het ingevoegde teken zetten. */
	await tick();
	el.setSelectionRange(start + 1, start + 1);
	autoGrow({ currentTarget: el } as unknown as Event);
}

/* Een textarea groeit niet vanzelf mee. Hoogte eerst op auto, zodat
   scrollHeight de echte inhoud meet, daarna afgetopt op 7.5rem. */
function autoGrow(event: Event) {
	const el = event.currentTarget as HTMLTextAreaElement;
	el.style.height = "auto";
	el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
				<div class="chat-panel__heading">
					<span>
						{$_("tools.chat.label")}
					</span>
					{#if modelName}
						<span class="chat-panel__model">
							{modelName} via {providerLabel(providerName)}
						</span>
					{/if}
				</div>
			</div>

			<div class="chat-panel__actions">
				<button
					on:click={() => (settingsOpen = !settingsOpen)}
					class="chat-panel__action"
					type="button"
					aria-expanded={settingsOpen}
					title="Instructies van de assistent"
					aria-label="Instructies van de assistent"
				>
					<SettingsIcon size={20} />
				</button>

				<button
					on:click={openExportDialog}
					class="chat-panel__action"
					type="button"
					disabled={exporting || !sessionToken}
					title="Exporteer gesprek als JSON"
					aria-label="Exporteer gesprek als JSON"
				>
					<Download size={20} />
				</button>

				<button on:click={closeChat} class="chat-panel__action" type="button" aria-label="Close chat">
					<Close size={20} />
				</button>
			</div>
		</header>

		{#if settingsOpen}
			<UiToolSettings />
		{/if}

		<div bind:this={bodyEl} class="chat-panel__body">
			{#each events as event}
				{#if event.type === "start"}
					<div class="bubble bubble--user">{event.question}</div>

				{:else if event.type === "ui"}
					<UiToolStep
						summary={event.summary}
						status={event.status}
						detail={event.detail}
						on:apply={() => applyUi(event.toolCallId)}
						on:dismiss={() => dismissUi(event.toolCallId)}
						on:always={() => alwaysApplyUi(event.toolCallId, event.toolName)}
					/>

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
			<textarea
				class="chat-panel__input"
				bind:value={question}
				placeholder="Stel een vraag"
				disabled={busy}
				rows="1"
				on:keydown={handleKeydown}
				on:input={autoGrow}
			></textarea>
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

		{#if exportDialogOpen}
			<div class="export-dialog">
				<div class="export-dialog__box">
					<label class="export-dialog__label" for="export-reason">Waarom exporteer je dit?</label>
					<textarea
						id="export-reason"
						class="export-dialog__input"
						bind:value={exportReason}
						use:focusOnMount
						on:keydown={handleExportKeydown}
						rows="3"
					></textarea>
					<div class="export-dialog__actions">
						<button class="export-dialog__button" type="button" on:click={cancelExport}>
							Annuleren
						</button>
						<button
							class="export-dialog__button export-dialog__button--primary"
							type="button"
							on:click={handleExport}
						>
							Exporteren
						</button>
					</div>
				</div>
			</div>
		{/if}
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
		/* Zonder dit weigert een flex-item te krimpen onder zijn inhoud, en duwt
		   een lange modelnaam de sluitknop het paneel uit. */
		min-width: 0;
	}

	/* Titel en modelregel onder elkaar, zodat ze samen één flex-item vormen. */
	.chat-panel__heading {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		min-width: 0;
	}

	.chat-panel__model {
		opacity: 0.7;
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	.chat-panel__actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.chat-panel__action {
		display: flex;
		align-items: center;
		padding: 0.25rem;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.chat-panel__action:hover:not(:disabled) {
		background: rgb(255 255 255 / 15%);
	}

	.chat-panel__action:disabled {
		opacity: 0.4;
		cursor: not-allowed;
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
		/* Groeit de textarea, dan blijft de verstuurknop onderaan uitgelijnd. */
		align-items: flex-end;
		gap: 0.5rem;
		border-top: 1px solid var(--cds-ui-03, #e0e0e0);
		padding: 1rem;
	}

	.chat-panel__input {
		flex: 1;
		min-width: 0;
		/* Zelf slepen uit; de hoogte komt van autoGrow. */
		resize: none;
		overflow-y: auto;
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

	/* ---- Exportdialoog ---- */

	/* Absolute binnen .chat-panel (die staat op position: absolute), dus de
	   overlay dekt alleen het chatpaneel en niet de hele kaart. */
	.export-dialog {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgb(0 0 0 / 40%);
		z-index: 11;
	}

	.export-dialog__box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		padding: 1rem;
		background: var(--cds-ui-01, #f4f4f4);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		box-shadow: 0 2px 12px rgb(0 0 0 / 25%);
	}

	.export-dialog__label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.export-dialog__input {
		padding: 0.5rem;
		border: 1px solid var(--cds-ui-04, #8d8d8d);
		background: var(--cds-field-01, #ffffff);
		color: inherit;
		font: inherit;
		resize: vertical;
	}

	.export-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.export-dialog__button {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--cds-ui-04, #8d8d8d);
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.export-dialog__button--primary {
		border-color: var(--cds-interactive-01, #0f62fe);
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
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
