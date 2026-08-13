/**
 * Shared colour + value-formatting helpers for the Zonal Statistics tool, used
 * by both the floating table view and the tool panel so the styled-cell colours,
 * legend chips and summary all render identically.
 */
import { get } from "svelte/store";
import { locale } from "svelte-i18n";

import type { ZonalValueStyle } from "./zonal-config";

export type Rgb = [number, number, number];

const TEXT_DARK = { css: "#161616", rgb: [22, 22, 22] as Rgb };
const TEXT_LIGHT = { css: "#ffffff", rgb: [255, 255, 255] as Rgb };

export function hexToRgb(hex: string): Rgb | undefined {
	const short = hex.trim().replace(/^#/, "");
	const h = short.length === 3 ? short.replace(/./g, (c) => c + c) : short;
	if (!/^[0-9a-f]{6}$/i.test(h)) return undefined;
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
	const channel = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Whichever of the two text colours has the higher WCAG contrast on this background. */
export function readableTextColor(background: Rgb) {
	const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
	const bg = luminance(background);
	return contrast(bg, luminance(TEXT_LIGHT.rgb)) >= contrast(bg, luminance(TEXT_DARK.rgb))
		? TEXT_LIGHT
		: TEXT_DARK;
}

export interface ZonalStyler {
	/** Inline style (background + contrasting text colour) for a colour swatch. */
	swatchStyle(background: string): string;
	/** The configured style for a (categorical) value, matched case-insensitively. */
	styleFor(value: string | undefined): ZonalValueStyle | undefined;
	/** Inline cell style for a value; empty string unless the column is styled + matched. */
	cellStyle(value: string | undefined, styled: boolean): string;
	/** PDF fill + text colour for a value (hex colours only), or undefined. */
	pdfColor(value: string): { fill: Rgb; text: Rgb } | undefined;
}

/** Build a styler bound to one tool's `valueStyles`, caching per-colour swatch styles. */
export function createZonalStyler(valueStyles: Array<ZonalValueStyle>): ZonalStyler {
	// value (upper-cased) -> configured style, for cell colours + legend.
	const valueStyleMap = new Map(valueStyles.map((s) => [s.value.trim().toUpperCase(), s]));
	// Cache the computed inline style per colour so rendering doesn't rerun the
	// hex->rgb->luminance math for every cell (colours are few).
	const swatchCache = new Map<string, string>();

	const styleFor = (value: string | undefined) =>
		value ? valueStyleMap.get(value.trim().toUpperCase()) : undefined;

	function swatchStyle(background: string): string {
		const cached = swatchCache.get(background);
		if (cached !== undefined) return cached;
		const rgb = hexToRgb(background);
		const style = `background-color: ${background};${rgb ? ` color: ${readableTextColor(rgb).css};` : ""}`;
		swatchCache.set(background, style);
		return style;
	}

	function cellStyle(value: string | undefined, styled: boolean): string {
		const color = styled ? styleFor(value)?.color : undefined;
		return color ? swatchStyle(color) : "";
	}

	function pdfColor(value: string) {
		const fill = hexToRgb(styleFor(value)?.color ?? "");
		return fill ? { fill, text: readableTextColor(fill).rgb } : undefined;
	}

	return { swatchStyle, styleFor, cellStyle, pdfColor };
}

/** Format an area in m² as km² (≥ 1 km²) or m² (below 1 km²), localized. */
export function formatArea(sqMeters: number): string {
	const currentLocale = get(locale) ?? undefined;
	if (sqMeters >= 1_000_000) {
		const km2 = (sqMeters / 1_000_000).toLocaleString(currentLocale, { maximumFractionDigits: 2 });
		return `${km2} km²`;
	}
	return `${Math.round(sqMeters).toLocaleString(currentLocale)} m²`;
}

/** Format a statistic value with up to two decimals, localized. */
export function formatNumber(value: number): string {
	return value.toLocaleString(get(locale) ?? undefined, { maximumFractionDigits: 2 });
}
