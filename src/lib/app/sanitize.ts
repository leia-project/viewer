import DOMPurify from "dompurify";

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
	if (node.getAttribute?.("target") === "_blank") {
		node.setAttribute("rel", "noopener noreferrer");
	}
});

/** Strips scripts, event handlers and `javascript:` URLs from HTML coming from configs or remote data. */
export function sanitizeHtml(html: unknown): string {
	if (html === undefined || html === null) return "";
	return DOMPurify.sanitize(String(html), {
		ADD_TAGS: ["iframe"],
		ADD_ATTR: ["target", "allow", "allowfullscreen", "frameborder"]
	});
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Returns the absolute URL when it uses http(s), otherwise `undefined`. */
export function safeHttpUrl(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	try {
		const url = new URL(value.trim(), window.location.href);
		return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
	} catch {
		return undefined;
	}
}
