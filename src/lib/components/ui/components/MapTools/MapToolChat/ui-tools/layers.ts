import { get } from "svelte/store";

import { GeoJsonLayer } from "$lib/components/map-cesium/module/layers/geojson-layer";

import type { Layer } from "$lib/components/map-core/layer";

/* Een id die ook werkt als de pagina niet via https/localhost wordt geladen
   (crypto.randomUUID bestaat alleen in een secure context). */
export function newId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface LayerProperty {
	name: string;
	kind: "number" | "text";
}

export interface LabelledLayer {
	label: string;
	layer: Layer;
}

/* Hoe de assistent lagen op de kaart noemt. Elke vraag krijgt hij de actuele
   lijst (als state, en als toegestane waarden van `layer_ref` in de tools), zodat
   hij een naam uit die lijst kiest in plaats van er een te verzinnen.

   Achtergrondkaarten blijven erbuiten: die zijn geen data van de gebruiker. Heten
   twee lagen hetzelfde, dan krijgen de latere " (2)", " (3)", ... zodat een label
   precies één laag aanwijst. */
export function labelLayers(layers: Layer[]): LabelledLayer[] {
	const seen = new Map<string, number>();
	return layers
		.filter((layer) => !layer.config.isBackground)
		.map((layer) => {
			const count = (seen.get(layer.title) ?? 0) + 1;
			seen.set(layer.title, count);
			return { label: count === 1 ? layer.title : `${layer.title} (${count})`, layer };
		});
}

export function findLayer(layers: Layer[], label: string): Layer {
	const labelled = labelLayers(layers);
	const match = labelled.find((entry) => entry.label === label);
	if (!match) {
		const names = labelled.map((entry) => `"${entry.label}"`).join(", ") || "(geen)";
		throw new Error(`Er staat geen laag "${label}" op de kaart. Lagen op de kaart: ${names}.`);
	}
	return match.layer;
}

/* De eigenschappen van de objecten in een laag, waarop gekleurd kan worden. Alleen
   GeoJSON-lagen houden die samengevat bij en kunnen herkleurd worden; een WFS-laag
   bewaart ze wel per object, maar kent geen herkleuring. */
export function layerProperties(layer: Layer): LayerProperty[] {
	if (!(layer instanceof GeoJsonLayer)) return [];
	return layer.getPropertySummary().map((property) => ({
		name: property.propertyName,
		kind: property.propertyType === "number" ? "number" : "text"
	}));
}

export function isStylable(layer: Layer): layer is GeoJsonLayer {
	return layer instanceof GeoJsonLayer && layerProperties(layer).length > 0;
}

export function describeLegend(layer: GeoJsonLayer, limit = 10): string {
	const legend = get(layer.legend) ?? [];
	const shown = legend.slice(0, limit).map((entry) => `${entry.label}: ${entry.color}`);
	return shown.join("; ") + (legend.length > limit ? `; … (+${legend.length - limit})` : "");
}
