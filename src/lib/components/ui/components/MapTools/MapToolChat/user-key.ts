/* De sleutel waarmee de gebruiker bij de API is ingelogd (zie `GET /session` in de backend).
   Eén plek voor de hele chat: ChatPanel en de Gaia-lagen vragen hem hier op, zodat de
   gebruiker maar één keer hoeft in te loggen. Een sleutel verloopt niet, dus hij blijft in
   localStorage staan tot de API hem weigert. */

const STORAGE_KEY = "gaia.userKey";

export const authHeaders = (userKey: string) => ({ Authorization: `Bearer ${userKey}` });

const pending = new Map<string, Promise<string>>();

function readStoredKey(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function storeKey(key: string | null) {
	try {
		if (key) localStorage.setItem(STORAGE_KEY, key);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* localStorage kan geblokkeerd zijn; dan vragen we de volgende keer opnieuw. */
	}
}

async function isAccepted(apiUrl: string, key: string): Promise<boolean> {
	const response = await fetch(`${apiUrl}/session`, { headers: authHeaders(key) });
	return response.ok;
}

async function signIn(apiUrl: string): Promise<string> {
	const stored = readStoredKey();
	if (stored && (await isAccepted(apiUrl, stored))) return stored;
	storeKey(null);

	const entered = window.prompt("Vul je sleutel in om in te loggen (bijvoorbeeld user1):")?.trim();
	if (!entered) throw new Error("Niet ingelogd: er is geen sleutel ingevuld.");
	if (!(await isAccepted(apiUrl, entered))) throw new Error("Deze sleutel is niet bekend.");

	storeKey(entered);
	return entered;
}

/* De sleutel van de ingelogde gebruiker; vraagt erom als die er nog niet is. Gelijktijdige
   aanroepen delen één inlogpoging. Gooit een fout als de gebruiker niet inlogt. */
export function getUserKey(apiUrl: string): Promise<string> {
	let attempt = pending.get(apiUrl);
	if (!attempt) {
		attempt = signIn(apiUrl).finally(() => pending.delete(apiUrl));
		pending.set(apiUrl, attempt);
	}
	return attempt;
}
