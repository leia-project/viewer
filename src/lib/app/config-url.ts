function originOf(url: string | undefined): string | undefined {
	if (!url) return undefined;
	try {
		return new URL(url, window.location.href).origin;
	} catch {
		return undefined;
	}
}

/**
 * A config can inject HTML into the viewer, so `?config=` only accepts the viewer's own origin,
 * the origins of the configured CONFIG_URL / CONFIG_SERVER_URL and those in CONFIG_ALLOWED_ORIGINS.
 */
export function isAllowedConfigUrl(configUrl: string): boolean {
	let url: URL;
	try {
		url = new URL(configUrl, window.location.href);
	} catch {
		return false;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return false;

	const allowedOrigins = [
		window.location.href,
		process.env.CONFIG_URL,
		process.env.CONFIG_SERVER_URL,
		...(process.env.CONFIG_ALLOWED_ORIGINS ?? "").split(",")
	].map((entry) => originOf(entry?.trim()));

	return allowedOrigins.includes(url.origin);
}

/** Reads `?config=` from the address bar, ignoring it when its origin is not allowed. */
export function getRequestedConfigUrl(): string | null {
	const configUrl = new URLSearchParams(window.location.search).get("config");
	if (configUrl && !isAllowedConfigUrl(configUrl)) {
		console.warn(`Ignoring ?config=${configUrl}: origin is not in CONFIG_ALLOWED_ORIGINS.`);
		return null;
	}
	return configUrl;
}
