import { applyStyle } from "ol-mapbox-style";
import VectorTileLayer from "ol/layer/VectorTile.js";
import type { StyleFunction } from "ol/style/Style.js";

/* A Mapbox / MapLibre style (style.json) for an MVT layer, including its sprite (icons) and text
   labels, as an OpenLayers StyleFunction.

   ol-mapbox-style's `applyStyle` puts the style on an OpenLayers layer; that layer is never
   shown (the tiles are drawn onto a canvas for Cesium, see MvtImageryProvider), it only holds
   the style function. Its source is left alone (`updateSource: false`), so it downloads no
   tiles. The style uses the layers of the style's first vector source.

   The layer changes once the sprite image has loaded: tiles drawn before that have no icons,
   so `onChange` should redraw them. */

export interface GlStyle {
	style: StyleFunction;
	/* The zoom levels at which the style's source has tiles, if the style says so. */
	minZoom: number | undefined;
	maxZoom: number | undefined;
}

export async function loadGlStyle(styleUrl: string, onChange: () => void): Promise<GlStyle> {
	const response = await fetch(styleUrl);
	if (!response.ok) throw new Error(`Fetching style ${styleUrl} failed: ${response.status}`);
	const glStyle = await response.json();

	const layer = new VectorTileLayer();
	/* `styleUrl`: relative sprite and font URLs in the style are relative to it. */
	await applyStyle(layer, glStyle, { updateSource: false, styleUrl });
	layer.on("change", onChange);
	const style = layer.getStyleFunction();
	if (!style) throw new Error(`Style ${styleUrl} has no layers for a vector source.`);

	const source = glStyle.sources?.[layer.get("mapbox-source")] ?? {};
	const zoom = (value: unknown) => (Number.isInteger(value) ? (value as number) : undefined);
	return { style, minZoom: zoom(source.minzoom), maxZoom: zoom(source.maxzoom) };
}
