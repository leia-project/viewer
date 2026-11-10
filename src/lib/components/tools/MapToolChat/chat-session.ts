import { tick } from "svelte";
import { get, writable, type Readable } from "svelte/store";
import { _, locale } from "svelte-i18n";
import { HttpAgent, type AgentSubscriber } from "@ag-ui/client";

import type { Map } from "$lib/map-cesium/map";
import { getWfsAttributeNames } from "$lib/map-cesium/providers/wfs-attributes";

import { chatApiUrl } from "./chat-store";
import type { ChatEvent, UiEvent } from "./chat-types";
import { exportConversation } from "./conversation-export";
import { authHeaders, getUserKey } from "./user-key";
import { getUiTool, toAgUiTools } from "./ui-tools/tools";
import { labelLayers, layerProperties, newId } from "./ui-tools/layers";
import { uiToolApproval, setApproval } from "./ui-tools/settings";
import type { UiTool } from "./ui-tools/types";

interface UiCall {
	tool: UiTool<unknown>;
	args: unknown;
}

const DECLINED = "The user declined this instruction.";

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export interface ChatSession {
	events: Readable<ChatEvent[]>;
	/* De agent is aan het denken. */
	busy: Readable<boolean>;
	/* Het verbruik over het hele gesprek. */
	totalTokens: Readable<number>;
	/* De sleutel van de ingelogde gebruiker; leeg tot de eerste vraag erom vraagt. */
	userKey: Readable<string>;
	ask(question: string): Promise<void>;
	applyUi(toolCallId: string): void;
	dismissUi(toolCallId: string): void;
	alwaysApplyUi(toolCallId: string, toolName: string): void;
	exportConversation(reason: string): Promise<void>;
}

export function createChatSession(getMap: () => Map | undefined): ChatSession {
	const events = writable<ChatEvent[]>([]);
	const busy = writable(false);
	const totalTokens = writable(0);
	const userKey = writable("");

	/* De gespreksdraad van deze pagina: herladen begint een nieuw gesprek. De backend
	   maakt er samen met het sessietoken de draad-id van. */
	const conversationId = newId();

	/* De AG-UI-client houdt het gesprek bij en stuurt het bij elke vraag opnieuw mee. */
	let agent: HttpAgent | undefined;

	/* tool_call_id -> toolnaam, om een resultaat bij zijn tool te tonen. */
	const toolNames: Record<string, string> = {};

	/* Instructies die op de keuze van de gebruiker wachten. */
	const awaiting: Record<string, UiCall> = {};

	/* Uitkomsten van instructies die de agent nog niet kent. Ze gaan mee vóór de
	   volgende vraag: die volgorde verwacht de backend. */
	let pendingResults: { toolCallId: string; content: string; error?: string }[] = [];

	/* Instructies lopen één voor één, in de volgorde van de agent. */
	let execution: Promise<void> = Promise.resolve();

	const push = (event: ChatEvent) => events.update((list) => [...list, event]);

	function patchUi(toolCallId: string, patch: Partial<UiEvent>) {
		events.update((list) =>
			list.map((e) => (e.type === "ui" && e.toolCallId === toolCallId ? { ...e, ...patch } : e))
		);
	}

	function finishUi(toolCallId: string, status: UiEvent["status"], detail: string) {
		patchUi(toolCallId, { status, detail });
		pendingResults.push({ toolCallId, content: detail, error: status === "failed" ? detail : undefined });
	}

	function runUi(toolCallId: string, call: UiCall) {
		patchUi(toolCallId, { status: "running" });
		execution = execution.then(async () => {
			try {
				const map = getMap();
				const apiUrl = get(chatApiUrl);
				if (!map) throw new Error("De kaart is niet beschikbaar.");
				if (!apiUrl) throw new Error("De backend-URL is niet bekend.");
				const detail = await call.tool.execute(call.args, { map, apiUrl, userKey: get(userKey) });
				finishUi(toolCallId, "applied", detail);
			} catch (error) {
				finishUi(toolCallId, "failed", errorText(error));
			}
			/* Laat Svelte de wijziging (bijv. een nieuwe laag) verwerken voor de volgende. */
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
			push({ type: "ui", toolCallId, toolName, summary: toolName, status: "failed" });
			finishUi(toolCallId, "failed", errorText(error));
			return;
		}

		push({ type: "ui", toolCallId, toolName, summary: tool.describe(args), status: "awaiting" });
		if ((get(uiToolApproval)[toolName] ?? tool.defaultApproval) === "auto") {
			runUi(toolCallId, { tool, args });
		} else {
			awaiting[toolCallId] = { tool, args };
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

	/* De AG-UI-events vertaald naar wat het paneel toont. */
	const subscriber: AgentSubscriber = {
		onTextMessageEndEvent: ({ textMessageBuffer }) => {
			if (textMessageBuffer.trim()) push({ type: "answer", markdown: textMessageBuffer });
		},

		onToolCallStartEvent: ({ event }) => {
			toolNames[event.toolCallId] = event.toolCallName;
		},

		onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
			if (getUiTool(toolCallName)) handleUiCall(event.toolCallId, toolCallName, toolCallArgs);
			else push({ type: "call", tool: toolCallName, args: toolCallArgs });
		},

		onToolCallResultEvent: ({ event }) => {
			const tool = toolNames[event.toolCallId] ?? null;
			if (event.metadata?.error) {
				push({ type: "error", tool, error: String(event.content) });
				return;
			}
			let content: unknown = event.content;
			try {
				if (typeof content === "string") content = JSON.parse(content);
			} catch {
				/* gewone tekst: laten zoals hij is */
			}
			push({ type: "result", tool, content });
		},

		/* Geen usage betekent dat geen modelaanroep iets meldde, niet dat het nul tokens waren. */
		onRunFinishedEvent: ({ event }) => {
			const tokens = (event.usage ?? []).reduce((sum, usage) => sum + (usage.totalTokens ?? 0), 0);
			totalTokens.update((total) => total + tokens);
		},

		onRunErrorEvent: ({ event }) => push({ type: "error", error: event.message }),

		onRunFailed: ({ error }) => {
			console.error("Agent-run mislukt:", error);
			push({ type: "error", error: get(_)("tools.chat.errors.noConnection") });
		}
	};

	async function ask(question: string) {
		if (get(busy)) return;
		busy.set(true);

		try {
			const apiUrl = get(chatApiUrl);
			if (!apiUrl) throw new Error(get(_)("tools.chat.errors.noApiUrl"));
			if (!get(userKey)) userKey.set(await getUserKey(apiUrl));
			const map = getMap();
			const refs = await webserviceRefs(map);

			agent ??= new HttpAgent({ url: `${apiUrl}/agent/run`, threadId: conversationId });
			agent.headers = authHeaders(get(userKey));

			/* Onbeantwoorde instructies vervallen; de backend vult zelf "geen resultaat" in. */
			for (const toolCallId of Object.keys(awaiting)) {
				patchUi(toolCallId, { status: "expired" });
				delete awaiting[toolCallId];
			}

			/* Eerst wat er met eerdere instructies is gebeurd, dan de nieuwe vraag. */
			for (const { toolCallId, content, error } of pendingResults) {
				agent.addMessage({ id: newId(), role: "tool", toolCallId, content, error });
			}
			pendingResults = [];
			agent.addMessage({ id: newId(), role: "user", content: question });

			/* De agent kent de lagen alleen hieruit: `layers` zijn de webservices die hij kan
			   bevragen, `map_layers` alles waar hij op kan werken, onder de namen die de
			   tools accepteren. */
			agent.state = {
				layers: refs,
				map_layers: labelLayers(map ? get(map.layers) : []).map(({ label, layer }) => ({
					name: label,
					type: layer.config.type,
					properties: layerProperties(layer)
				}))
			};

			push({ type: "question", text: question });

			/* De backend raadt de taal niet zelf, maar volgt de interface ("nl-NL" -> "nl"). */
			const language = get(locale)?.split("-")[0] ?? "en";
			await agent
				.runAgent({ tools: toAgUiTools(map), forwardedProps: { language } }, subscriber)
				.catch(() => {
					/* al gemeld via onRunFailed */
				});
		} catch (error) {
			/* Inloggen of de lagen ophalen mislukte: dan is de vraag niet verstuurd. */
			console.error("Vraag niet verstuurd:", error);
			push({ type: "error", error: errorText(error) });
		} finally {
			busy.set(false);
		}
	}

	async function exportCurrent(reason: string) {
		const apiUrl = get(chatApiUrl);
		if (!apiUrl || !get(userKey)) return;
		await exportConversation(apiUrl, get(userKey), conversationId, reason);
	}

	return {
		events,
		busy,
		totalTokens,
		userKey,
		ask,
		applyUi,
		dismissUi,
		alwaysApplyUi,
		exportConversation: exportCurrent
	};
}

/* Leia's WFS- en WMS-lagen als WebserviceLayerRef (backend/app/main.py). Alleen WFS
   krijgt attribuutnamen: WMS kent geen DescribeFeatureType. */
async function webserviceRefs(map: Map | undefined) {
	const layers = map ? get(map.layers) : [];
	return Promise.all(
		layers
			.filter((layer) => ["wfs", "wms"].includes(layer.config.type))
			.map(async ({ config: { type, title, settings } }) => {
				/* WMS-lagen hebben geen `options`. */
				const options = type === "wfs" ? settings.options : undefined;
				const ref = {
					service_endpoint: settings.url,
					layer_name: type === "wms" ? settings.featureName : (options?.featureType ?? settings.featureType),
					layer_label: title,
					service_type: type,
					service_version: options?.version ?? settings.version
				};
				if (type === "wms") return ref;
				const { service_endpoint, layer_name, service_version } = ref;
				return {
					...ref,
					attribute_names: await getWfsAttributeNames(service_endpoint, layer_name, service_version)
				};
			})
	);
}
