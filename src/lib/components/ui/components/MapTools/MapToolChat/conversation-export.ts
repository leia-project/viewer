/**
 * Exporteert de opgeslagen gespreksstaat van de huidige sessie als JSON-bestand.
 *
 * De backend leest die staat terug uit de LangGraph-checkpointer, dus in het
 * bestand belandt de volledige AgentState: alle berichten, tool-aanroepen,
 * tool-resultaten en de retry/error-boekhouding — niet alleen wat het paneel
 * toevallig op het scherm heeft staan.
 *
 * Leia stuurt geen `conversation_id` mee bij /query/stream, en dan houdt de
 * backend één draad per sessietoken aan (zie build_thread_id in
 * backend/app/src/services/agent/orchestrator.py). Daarom vragen we hier ook
 * zonder id op: dat is precies dezelfde draad.
 */

export async function exportConversation(apiUrl: string, sessionToken: string): Promise<void> {
	const response = await fetch(`${apiUrl}/conversation/export`, {
		headers: { "X-Session-Token": sessionToken }
	});

	if (!response.ok) {
		throw new Error(`Export mislukt: ${response.status}`);
	}

	const data = await response.json();

	/* Een Blob is een bestand in het geheugen; createObjectURL geeft er een
	   tijdelijke URL op uit, waar een nagebootste klik op <a download> naartoe
	   "navigeert". Zo dwing je een download af zonder server-bestand. */
	const blob = new Blob([JSON.stringify(data.conversation, null, 2)], {
		type: "application/json"
	});
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = `gesprek-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	/* Zonder dit blijft de Blob in het geheugen staan tot de pagina herlaadt. */
	URL.revokeObjectURL(url);
}
