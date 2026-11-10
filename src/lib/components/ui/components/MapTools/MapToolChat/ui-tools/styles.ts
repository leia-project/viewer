import type { DataDrivenStyle } from "$lib/components/map-cesium/module/providers/mvt-style";

/* Kleuren voor het kleuren van een laag op een eigenschap. De assistent noemt alleen de
   eigenschap en het soort indeling; de kleuren kiest de viewer, zodat het model nooit
   zelf kleuren per object hoeft te verzinnen.

   Bewust een kopie van frontend/app/utils/styleUtils.ts: de twee frontends delen geen
   bestanden (ze draaien op aparte servers), dus houd de paletten gelijk met de hand. */

/* Okabe-Ito plus enkele aanvullingen: ook te onderscheiden voor kleurenblinden. */
const CATEGORICAL_PALETTE = [
	"#0072b2", "#e69f00", "#009e73", "#cc79a7", "#d55e00", "#56b4e9",
	"#f0e442", "#7f7f7f", "#8c564b", "#17becf", "#bcbd22", "#e377c2"
];

/* Licht naar donker, zodat een hogere waarde als "meer" leest. */
const SEQUENTIAL_PALETTES: Record<string, string[]> = {
	blues: ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#08306b"],
	greens: ["#e5f5e0", "#a1d99b", "#41ab5d", "#238b45", "#00441b"],
	oranges: ["#feedde", "#fdbe85", "#fd8d3c", "#d94701", "#7f2704"],
	purples: ["#efedf5", "#bcbddc", "#807dba", "#6a51a3", "#3f007d"],
	viridis: ["#fde725", "#5ec962", "#21918c", "#3b528b", "#440154"]
};

export const FALLBACK_COLOR = "#bdbdbd";
export const MAX_CATEGORIES = CATEGORICAL_PALETTE.length;

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: number[]): string {
	return "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

/* `count` kleuren gelijkmatig langs de stops van een palet. */
function sampleRamp(stops: string[], count: number): string[] {
	if (count === 1) return [stops[Math.floor(stops.length / 2)]];
	return Array.from({ length: count }, (_, i) => {
		const position = (i / (count - 1)) * (stops.length - 1);
		const lower = Math.floor(position);
		const upper = Math.min(lower + 1, stops.length - 1);
		const t = position - lower;
		const a = hexToRgb(stops[lower]);
		const b = hexToRgb(stops[upper]);
		return rgbToHex(a.map((channel, k) => channel + (b[k] - channel) * t));
	});
}

/* Eén kleur per waarde; `values` komen het vaakst voorkomend eerst. */
export function categoricalFromValues(property: string, values: string[]): DataDrivenStyle {
	if (values.length === 0) throw new Error(`Geen enkel object heeft een waarde voor "${property}".`);
	if (values.length > MAX_CATEGORIES) {
		throw new Error(`"${property}" heeft ${values.length} verschillende waarden; meer dan ${MAX_CATEGORIES} zijn niet op kleur te onderscheiden.`);
	}
	return {
		property,
		kind: "categorical",
		categories: values.map((value, i) => ({ value, color: CATEGORICAL_PALETTE[i] })),
		fallbackColor: FALLBACK_COLOR
	};
}

/* Kleurklassen tussen grenswaarden (ondergrens van elke klasse na de eerste). */
export function graduatedFromBreaks(property: string, breaks: number[], palette = "blues"): DataDrivenStyle {
	const ramp = SEQUENTIAL_PALETTES[palette];
	if (!ramp) throw new Error(`Onbekend palet "${palette}". Kies uit: ${Object.keys(SEQUENTIAL_PALETTES).join(", ")}.`);
	if (breaks.length === 0) throw new Error(`Er valt niets in klassen te verdelen in "${property}".`);
	return {
		property,
		kind: "graduated",
		breaks,
		colors: sampleRamp(ramp, breaks.length + 1),
		fallbackColor: FALLBACK_COLOR
	};
}

/* Eén regel over de klassen en hun kleuren, om de assistent aan de gebruiker te laten doorgeven. */
export function describeStyle(style: DataDrivenStyle): string {
	if (style.kind === "categorical") {
		return (style.categories ?? []).map(({ value, color }) => `${value}: ${color}`).join("; ");
	}
	const breaks = style.breaks ?? [];
	const round = (n: number) => Number(n.toPrecision(4));
	return (style.colors ?? [])
		.map((color, i) => {
			const label = i === 0 ? `onder ${round(breaks[0])}` : i < breaks.length ? `${round(breaks[i - 1])} tot ${round(breaks[i])}` : `vanaf ${round(breaks[i - 1])}`;
			return `${label}: ${color}`;
		})
		.join("; ");
}
