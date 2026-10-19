export interface StoryMarkerImage {
	url: string;
	label?: string;
}

export interface StoryBeforeAfterAction {
	type: "beforeAfter";
	before: StoryMarkerImage;
	after: StoryMarkerImage;
}

export type StoryHtmlAction = { type: "html" } & (
	| { html: string; url?: never }
	| { url: string; html?: never }
);

export type StoryMarkerAction = StoryBeforeAfterAction | StoryHtmlAction;

export interface StoryMarker {
	type: "marker";
	id: string;
	title: string;
	x: number;
	y: number;
	action: StoryMarkerAction;
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function isSafeStoryUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value, "https://example.invalid/");
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseImage(value: unknown): StoryMarkerImage | undefined {
	if (!isRecord(value) || !isNonEmptyString(value.url) || !isSafeStoryUrl(value.url)) {
		return undefined;
	}
	if (value.label !== undefined && !isNonEmptyString(value.label)) return undefined;
	return {
		url: value.url.trim(),
		label: typeof value.label === "string" ? value.label.trim() : undefined
	};
}

function parseAction(value: unknown): StoryMarkerAction | undefined {
	if (!isRecord(value)) return undefined;
	if (value.type === "beforeAfter") {
		const before = parseImage(value.before);
		const after = parseImage(value.after);
		return before && after ? { type: "beforeAfter", before, after } : undefined;
	}
	if (value.type === "html") {
		if (isNonEmptyString(value.html) && value.url === undefined) {
			return { type: "html", html: value.html };
		}
		if (isNonEmptyString(value.url) && isSafeStoryUrl(value.url) && value.html === undefined) {
			return { type: "html", url: value.url.trim() };
		}
	}
	return undefined;
}

export function parseStoryMarkers(raw: unknown): Array<StoryMarker> {
	if (raw === undefined) return [];
	if (!Array.isArray(raw)) {
		console.warn("Story markers skipped: markers must be an array.", raw);
		return [];
	}

	const markers: Array<StoryMarker> = [];
	const ids = new Set<string>();
	for (const entry of raw) {
		if (
			!isRecord(entry) ||
			entry.type !== "marker" ||
			!isNonEmptyString(entry.id) ||
			!isNonEmptyString(entry.title) ||
			typeof entry.x !== "number" ||
			!Number.isFinite(entry.x) ||
			Math.abs(entry.x) > 180 ||
			typeof entry.y !== "number" ||
			!Number.isFinite(entry.y) ||
			Math.abs(entry.y) > 90
		) {
			console.warn(
				"Story marker skipped: use type 'marker', a non-empty id/title and valid longitude/latitude.",
				entry
			);
			continue;
		}

		const id = entry.id.trim();
		if (ids.has(id)) {
			console.warn(`Story marker skipped: duplicate id "${id}".`, entry);
			continue;
		}
		const action = parseAction(entry.action);
		if (!action) {
			console.warn(
				`Story marker "${id}" skipped: use a beforeAfter action with two valid image urls, or an html action with either html or a valid url.`,
				entry
			);
			continue;
		}
		ids.add(id);
		markers.push({ type: "marker", id, title: entry.title.trim(), x: entry.x, y: entry.y, action });
	}
	return markers;
}
