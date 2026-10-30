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

export interface StoryImageAction {
	type: "image";
	images: Array<StoryMarkerImage>;
}

export type StoryMarkerAction = StoryBeforeAfterAction | StoryImageAction | StoryHtmlAction;

export interface StoryMarker {
	type: "marker";
	id: string;
	title: string;
	x: number;
	y: number;
	action: StoryMarkerAction;
	/** Optional image that replaces the default map icon. */
	symbolUrl?: string;
	/** Maximum width and height in pixels for symbolUrl; defaults to 128. */
	maxImageSize?: number;
	/** Optional icon width/height in pixels; overrides the story's markerSize. */
	markerSize?: number;
}

export const DEFAULT_MARKER_SIZE = 52;

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function parseMarkerSize(value: unknown, context: unknown): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
	console.warn("Story markerSize ignored: must be a positive number of pixels", context);
	return undefined;
}

export function parseMaxImageSize(value: unknown, context: unknown): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
	console.warn("Story marker maxImageSize ignored: must be a positive number of pixels", context);
	return undefined;
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
	if (value.type === "image") {
		if (!Array.isArray(value.images) || value.images.length === 0) return undefined;
		const images = value.images.map(parseImage);
		return images.every((image): image is StoryMarkerImage => image !== undefined)
			? { type: "image", images }
			: undefined;
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
				`Story marker "${id}" skipped: use a beforeAfter action with two valid image urls, an image action with one or more valid image urls, or an html action with either html or a valid url.`,
				entry
			);
			continue;
		}
		if (entry.symbolUrl !== undefined && !isNonEmptyString(entry.symbolUrl)) {
			console.warn(`Story marker "${id}" symbolUrl ignored: must be a non-empty string.`, entry);
		}
		ids.add(id);
		markers.push({
			type: "marker",
			id,
			title: entry.title.trim(),
			x: entry.x,
			y: entry.y,
			action,
			symbolUrl: isNonEmptyString(entry.symbolUrl) ? entry.symbolUrl.trim() : undefined,
			maxImageSize: parseMaxImageSize(entry.maxImageSize, entry),
			markerSize: parseMarkerSize(entry.markerSize, entry)
		});
	}
	return markers;
}
