import { asArray } from "ol/color.js";
import { Fill, Stroke, Style } from "ol/style.js";
import CircleStyle from "ol/style/Circle.js";

import type { FeatureLike } from "ol/Feature.js";
import type { StyleFunction } from "ol/style/Style.js";

/* How an MVT layer is drawn: a base style (fill, outline, point size), plus optional colouring
   by property that replaces the colour of the geometry. Everything here is plain OpenLayers
   style; Cesium is not involved. The result is a StyleFunction that MvtImageryProvider applies
   to the tiles. */

export interface LayerStyle {
	fillColor: string;
	fillOpacity: number;
	strokeColor: string;
	strokeWidth: number;
	strokeOpacity: number;
	pointRadius: number;
	pointStrokeColor: string;
	pointStrokeWidth: number;
}

/* Colouring by a property. */
export interface DataDrivenStyle {
	property: string;
	kind: "categorical" | "graduated" | "rules";
	categories?: { value: string; color: string }[]; // categorical: one colour per value
	breaks?: number[]; // graduated: lower bound of each class after the first, ascending
	colors?: string[]; // graduated: one colour per class, so breaks.length + 1
	rules?: ColorRule[]; // rules: the first one that matches gives the colour
	fallbackColor: string; // for features without a (usable) value, and for rules: when no rule matches
}

/* One class with its own condition, e.g. "> 20" or "between 5 and 20" (bounds inclusive). */
export interface ColorRule {
	op: ">" | ">=" | "<" | "<=" | "=" | "between";
	value: number;
	to?: number; // only for between
	color: string;
	label: string; // the condition, for the legend
}

function ruleMatches(rule: ColorRule, n: number): boolean {
	switch (rule.op) {
		case ">":
			return n > rule.value;
		case ">=":
			return n >= rule.value;
		case "<":
			return n < rule.value;
		case "<=":
			return n <= rule.value;
		case "=":
			return n === rule.value;
		case "between":
			return n >= rule.value && n <= (rule.to ?? rule.value);
	}
}

/* Fill/outline colour pairs for new layers. */
const FILL_COLORS = ["#ffbf00", "#e83f6f", "#2274a5", "#32936f"];
const STROKE_COLORS = ["#735600", "#770e2c", "#0f354a", "#174333"];

/* The next style from the palette, so layers added one after another get different colours. */
let nextPair = 0;
export function nextLayerStyle(): LayerStyle {
	const i = nextPair++ % FILL_COLORS.length;
	return {
		fillColor: FILL_COLORS[i],
		fillOpacity: 0.75,
		strokeColor: STROKE_COLORS[i],
		strokeWidth: 2,
		strokeOpacity: 1,
		pointRadius: 5,
		pointStrokeColor: "#ffffff",
		pointStrokeWidth: 2
	};
}

/* The colour of a feature when colouring by property. Categorical values are compared as text,
   a feature without a (usable) value gets the fallback colour, and a graduated class starts at
   its lower bound. */
function dataDrivenColor(style: DataDrivenStyle, properties: Record<string, unknown>): string {
	const value = properties[style.property];
	const blank = value === undefined || value === null || value === "";

	if (style.kind === "categorical") {
		if (blank) return style.fallbackColor;
		const text = String(value);
		return (
			style.categories?.find((category) => String(category.value) === text)?.color ??
			style.fallbackColor
		);
	}

	if (blank) return style.fallbackColor;
	if (style.kind === "rules") {
		const n = Number(value);
		if (!Number.isFinite(n)) return style.fallbackColor;
		return style.rules?.find((rule) => ruleMatches(rule, n))?.color ?? style.fallbackColor;
	}
	const colors = style.colors ?? [];
	const number = Number(value);
	const n = Number.isFinite(number) ? number : 0;
	const breaks = style.breaks ?? [];
	let index = 0;
	while (index < breaks.length && n >= breaks[index]) index++;
	return colors[index] ?? style.fallbackColor;
}

/* A CSS colour with an opacity applied, as rgba(...). */
function withOpacity(color: string, opacity: number): string {
	const [r, g, b, a] = asArray(color);
	return `rgba(${r}, ${g}, ${b}, ${a * opacity})`;
}

type Kind = "point" | "line" | "polygon";

function kindOf(feature: FeatureLike): Kind {
	/* For a RenderFeature (which is how tiles are decoded) the geometry is the feature itself. */
	const type = feature.getGeometry()?.getType() ?? "Polygon";
	if (type.endsWith("Point")) return "point";
	if (type.endsWith("LineString")) return "line";
	return "polygon";
}

/* The StyleFunction for a layer: the base style, with the colour of the geometry replaced by
   the data-driven colour if there is one. One Style per kind of geometry and colour is cached:
   a tile has thousands of features, but only a few colours. */
export function createStyleFunction(
	style: LayerStyle,
	dataDriven?: DataDrivenStyle
): StyleFunction {
	const cache = new Map<string, Style>();
	const make = (kind: Kind, color: string): Style => {
		const stroke = new Stroke({
			color: withOpacity(style.strokeColor, style.strokeOpacity),
			width: style.strokeWidth
		});
		if (kind === "line") {
			return new Style({
				stroke: new Stroke({
					color: withOpacity(color, style.strokeOpacity),
					width: style.strokeWidth
				})
			});
		}
		const fill = new Fill({ color: withOpacity(color, style.fillOpacity) });
		if (kind === "point") {
			return new Style({
				image: new CircleStyle({
					radius: style.pointRadius,
					fill,
					stroke: new Stroke({ color: style.pointStrokeColor, width: style.pointStrokeWidth })
				})
			});
		}
		return new Style({ fill, stroke });
	};

	return (feature) => {
		const kind = kindOf(feature);
		const color = dataDriven
			? dataDrivenColor(dataDriven, feature.getProperties())
			: kind === "line"
				? style.strokeColor
				: style.fillColor;
		const key = `${kind}|${color}`;
		let result = cache.get(key);
		if (!result) cache.set(key, (result = make(kind, color)));
		return result;
	};
}

/* The highlight of the selected feature: only that feature gets a style, everything else
   `undefined` (not drawn). `keyOf` decides what counts as "the same feature". */
export function createHighlightStyleFunction(
	keyOf: (feature: FeatureLike) => string,
	selectedKey: string,
	color: string
): StyleFunction {
	const point = new Style({
		image: new CircleStyle({
			radius: 9,
			fill: new Fill({ color: withOpacity(color, 0.85) }),
			stroke: new Stroke({ color: "#ffffff", width: 2 })
		})
	});
	const line = new Style({ stroke: new Stroke({ color, width: 5 }) });
	const polygon = new Style({
		fill: new Fill({ color: withOpacity(color, 0.6) }),
		stroke: new Stroke({ color, width: 4 })
	});
	return (feature) => {
		if (keyOf(feature) !== selectedKey) return undefined;
		const kind = kindOf(feature);
		return kind === "point" ? point : kind === "line" ? line : polygon;
	};
}
