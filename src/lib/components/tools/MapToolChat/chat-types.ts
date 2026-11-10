/* Wat het chatpaneel toont, in de volgorde waarin het gebeurde. */

export type UiStatus = "awaiting" | "running" | "applied" | "dismissed" | "failed" | "expired";

/* Een instructie van de assistent aan de viewer (bijv. "voeg deze laag toe"). */
export interface UiEvent {
	type: "ui";
	toolCallId: string;
	toolName: string;
	summary: string;
	status: UiStatus;
	detail?: string;
}

export type ChatEvent =
	/* De vraag van de gebruiker. */
	| { type: "question"; text: string }
	/* Een antwoord van de assistent, in markdown. */
	| { type: "answer"; markdown: string }
	/* Een aanroep van een backend-tool, met zijn argumenten. */
	| { type: "call"; tool: string; args: unknown }
	/* Het resultaat van zo'n aanroep: JSON als het dat was, anders tekst. */
	| { type: "result"; tool: string | null; content: unknown }
	| UiEvent
	/* Een mislukte tool-aanroep heeft een toolnaam, een mislukte run niet. */
	| { type: "error"; tool?: string | null; error: string };
