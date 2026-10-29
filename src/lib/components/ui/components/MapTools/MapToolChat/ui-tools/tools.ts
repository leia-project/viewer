import { get } from "svelte/store";

import { LayerConfig } from "$lib/components/map-core/layer-config";
import { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";

import { findLayer, isStylable, labelLayers, layerProperties, describeLegend, newId } from "./layers";

import type { Map } from "$lib/components/map-cesium/module/map";
import type { GeoJsonLayer } from "$lib/components/map-cesium/module/layers/geojson-layer";
import type { LabelledLayer } from "./layers";
import type { UiTool } from "./types";

/* De viewer kent een kleinere set dan de React-frontend: alleen GeoJSON-lagen kunnen
   op eigenschap gekleurd worden, en er is geen `set_layer_color`. De WFS-laag geeft
   zijn objecten bij het laden een willekeurige kleur en heeft (nog) geen manier om ze
   achteraf te herkleuren. Omdat elke frontend zelf zijn tools aanmeldt, hoeft de
   backend daar niets van te weten. */

function asObject(raw: unknown): Record<string, unknown> {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("De argumenten moeten een JSON-object zijn.");
	}
	return raw as Record<string, unknown>;
}

function requireString(obj: Record<string, unknown>, key: string): string {
	const value = obj[key];
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`"${key}" is verplicht en moet een niet-lege tekst zijn.`);
	}
	return value.trim();
}

function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
	const value = obj[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string") throw new Error(`"${key}" moet een tekst zijn.`);
	return value.trim() || undefined;
}

/* `layer_ref` mag alleen een van de lagen op de kaart zijn. */
const layerRefProperty = (layers: LabelledLayer[]) => ({
	type: "string",
	enum: layers.map(({ label }) => label),
	description: "Welke laag op de kaart. Moet exact een van de genoemde namen zijn."
});

interface LayerRefArgs {
	layerRef: string;
}

const parseLayerRef = (raw: unknown): LayerRefArgs => ({ layerRef: requireString(asObject(raw), "layer_ref") });

const layerRefParameters = (layers: LabelledLayer[]) => ({
	type: "object",
	properties: { layer_ref: layerRefProperty(layers) },
	required: ["layer_ref"]
});

const ADDED_GROUP_ID = "assistantAdded";

interface AddLayerArgs {
	serviceType: "wfs" | "wms";
	url: string;
	layerName: string;
	title?: string;
}

const addLayer: UiTool<AddLayerArgs> = {
	name: "add_layer",
	description:
		"Add a WFS or WMS layer to the user's map. Use the service url and layer name exactly as the user " +
		"gave them or as a dataset search returned them - never invent either. Only call this when the " +
		"user wants to see that data on the map.",
	defaultApproval: "ask",
	parameters: () => ({
		type: "object",
		properties: {
			service_type: { type: "string", enum: ["wfs", "wms"] },
			url: { type: "string", description: "Base URL of the service." },
			layer_name: { type: "string", description: "WFS type name / WMS layer name on that service." },
			title: { type: "string", description: "Optional name to show for the layer." }
		},
		required: ["service_type", "url", "layer_name"]
	}),
	parse: (raw) => {
		const obj = asObject(raw);
		const serviceType = requireString(obj, "service_type");
		if (serviceType !== "wfs" && serviceType !== "wms") {
			throw new Error('"service_type" moet "wfs" of "wms" zijn.');
		}
		const url = requireString(obj, "url");
		try {
			if (!["https:", "http:"].includes(new URL(url).protocol)) throw new Error();
		} catch {
			throw new Error('"url" moet een http(s)-URL zijn.');
		}
		return { serviceType, url, layerName: requireString(obj, "layer_name"), title: optionalString(obj, "title") };
	},
	describe: (args) => `Voeg de ${args.serviceType.toUpperCase()}-laag "${args.title ?? args.layerName}" toe aan de kaart`,
	execute: async (args, map) => {
		/* Dezelfde dienst + laag staat er al: niet dubbel toevoegen. */
		const existing = get(map.layers).find((layer) => {
			const settings = layer.config.settings ?? {};
			const name = layer.config.type === "wfs"
				? settings.options?.featureType ?? settings.featureType
				: settings.featureName;
			return layer.config.type === args.serviceType && settings.url === args.url && name === args.layerName;
		});
		if (existing) return `De laag "${existing.title}" staat al op de kaart.`;

		const library = map.layerLibrary;
		if (!library.findGroup(ADDED_GROUP_ID)) {
			library.addLayerConfigGroup(new LayerConfigGroup(ADDED_GROUP_ID, "Door de assistent toegevoegd"));
		}

		const config = new LayerConfig({
			id: newId(),
			title: args.title ?? args.layerName,
			type: args.serviceType,
			groupId: ADDED_GROUP_ID,
			defaultOn: true,
			settings:
				args.serviceType === "wfs"
					? { url: args.url, featureType: args.layerName }
					: { url: args.url, featureName: args.layerName }
		});
		library.addLayerConfig(config);
		config.added.set(true);

		/* De kaart meldt een mislukte laag zelf, maar zet dan alleen `added` terug. */
		const layer = map.getLayerById(config.id);
		if (!layer || !get(config.added)) {
			library.removeLayerConfig(config);
			throw new Error(`Kon de laag "${args.layerName}" niet toevoegen: de dienst reageert niet zoals verwacht of kent de laag niet.`);
		}
		return `${args.serviceType.toUpperCase()}-laag "${layer.title}" is aan de kaart toegevoegd.`;
	}
};

/* Alleen lagen met een bekende cameralocatie kunnen we aanvliegen - dezelfde regel
   als de zoomknop in de laagbeheerder. */
const flyTo: UiTool<LayerRefArgs> = {
	name: "fly_to",
	description: "Move the map view to show a layer.",
	defaultApproval: "auto",
	eligibleLayers: (layers) => layers.filter(({ layer }) => layer.getLayerPosition() !== undefined),
	parameters: layerRefParameters,
	parse: parseLayerRef,
	describe: (args) => `Vlieg naar de laag "${args.layerRef}"`,
	execute: async (args, map) => {
		const layer = findLayer(get(map.layers), args.layerRef);
		const position = layer.getLayerPosition();
		if (!position) throw new Error(`Van "${layer.title}" is geen locatie bekend om naartoe te vliegen.`);
		map.flyTo(position);
		return `De kaart vliegt naar "${layer.title}".`;
	}
};

interface SetVisibilityArgs extends LayerRefArgs {
	visible: boolean;
}

const setLayerVisibility: UiTool<SetVisibilityArgs> = {
	name: "set_layer_visibility",
	description: "Show or hide a layer that is on the map, without removing it.",
	defaultApproval: "auto",
	eligibleLayers: (layers) => layers,
	parameters: (layers) => ({
		type: "object",
		properties: { layer_ref: layerRefProperty(layers), visible: { type: "boolean" } },
		required: ["layer_ref", "visible"]
	}),
	parse: (raw) => {
		const obj = asObject(raw);
		if (typeof obj.visible !== "boolean") throw new Error('"visible" is verplicht en moet true of false zijn.');
		return { layerRef: requireString(obj, "layer_ref"), visible: obj.visible };
	},
	describe: (args) => `${args.visible ? "Toon" : "Verberg"} de laag "${args.layerRef}"`,
	execute: async (args, map) => {
		const layer = findLayer(get(map.layers), args.layerRef);
		layer.visible.set(args.visible);
		return `De laag "${layer.title}" is nu ${args.visible ? "zichtbaar" : "verborgen"}.`;
	}
};

const removeLayer: UiTool<LayerRefArgs> = {
	name: "remove_layer",
	description: "Remove a layer from the map. Only when the user asks for it.",
	defaultApproval: "ask",
	eligibleLayers: (layers) => layers,
	parameters: layerRefParameters,
	parse: parseLayerRef,
	describe: (args) => `Verwijder de laag "${args.layerRef}" van de kaart`,
	execute: async (args, map) => {
		const layer = findLayer(get(map.layers), args.layerRef);
		layer.remove();
		return `De laag "${layer.title}" is van de kaart verwijderd.`;
	}
};

interface ColorByPropertyArgs extends LayerRefArgs {
	property: string;
}

const colorLayerByProperty: UiTool<ColorByPropertyArgs> = {
	name: "color_layer_by_property",
	description:
		"Colour a layer's features by one of their properties, so features with different values get different " +
		"colours (e.g. \"colour the areas by type\"). `property` must be one of the layer's properties as listed " +
		"for that layer - never invent one. The app picks the colours, you cannot: a number property gets a " +
		"gradient over its range, a text property one colour per value. Only some layers can be coloured this way.",
	defaultApproval: "auto",
	eligibleLayers: (layers) => layers.filter(({ layer }) => isStylable(layer)),
	parameters: (layers) => ({
		type: "object",
		properties: {
			layer_ref: layerRefProperty(layers),
			property: { type: "string", description: "The property whose values decide the colour." }
		},
		required: ["layer_ref", "property"]
	}),
	parse: (raw) => {
		const obj = asObject(raw);
		return { layerRef: requireString(obj, "layer_ref"), property: requireString(obj, "property") };
	},
	describe: (args) => `Kleur de laag "${args.layerRef}" op basis van "${args.property}"`,
	execute: async (args, map) => {
		const layer = findLayer(get(map.layers), args.layerRef);
		if (!isStylable(layer)) {
			throw new Error(`"${layer.title}" kan niet op eigenschap gekleurd worden (alleen GeoJSON-lagen).`);
		}
		const available = layerProperties(layer);
		const property = available.find((p) => p.name === args.property);
		if (!property) {
			throw new Error(
				`"${layer.title}" heeft geen eigenschap "${args.property}". Eigenschappen: ${
					available.map((p) => `${p.name} (${p.kind})`).join(", ")
				}.`
			);
		}
		(layer as GeoJsonLayer).style.set(property.name);
		return `"${layer.title}" is gekleurd op "${property.name}". ${describeLegend(layer as GeoJsonLayer)}.`;
	}
};

/* Op `UiTool<unknown>` gezet aan de rand van de lijst: aanroepers gaan altijd eerst
   langs tool.parse, en dat maakt het argumenttype betrouwbaar. */
export const UI_TOOLS = [addLayer, flyTo, setLayerVisibility, colorLayerByProperty, removeLayer] as unknown as UiTool<unknown>[];

export function getUiTool(name: string): UiTool<unknown> | undefined {
	return UI_TOOLS.find((tool) => tool.name === name);
}

/* De tools zoals AG-UI RunAgentInput.tools ze wil, voor de lagen op de kaart nu. */
export function toAgUiTools(map: Map | undefined) {
	const layers = labelLayers(map ? get(map.layers) : []);
	return UI_TOOLS.flatMap((tool) => {
		const eligible = tool.eligibleLayers ? tool.eligibleLayers(layers) : [];
		if (tool.eligibleLayers && eligible.length === 0) return [];
		return [{ name: tool.name, description: tool.description, parameters: tool.parameters(eligible) }];
	});
}
