import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { StyleFunction } from "ol/style/Style.js";

import { CesiumImageryLayer } from "./imagery-layer";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import { MvtImageryProvider, featureKey, type TileCache } from "../providers/mvt-imagery-provider";
import {
	createHighlightStyleFunction,
	createStyleFunction,
	nextLayerStyle,
	type DataDrivenStyle,
	type LayerStyle
} from "../providers/mvt-style";
import { loadGlStyle, type GlStyle } from "../providers/mvt-gl-style";
import { CustomLayerControl } from "$lib/map-core/custom-layer-control";
import LayerControlMvt from "$lib/components/layer-controls/LayerControlMvt/LayerControlMvt.svelte";

import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";

/* [west, south, east, north] if the value is a valid extent in degrees. An extent in another CRS
   (e.g. RD in metres) would make Cesium fail. */
function degreesExtent(value: unknown): [number, number, number, number] | undefined {
	const [west, south, east, north] = Array.isArray(value) ? value : [];
	const valid =
		-180 <= west && west < east && east <= 180 && -90 <= south && south < north && north <= 90;
	return valid ? [west, south, east, north] : undefined;
}

export interface MvtProperty {
	name: string;
	kind: "number" | "text";
}

/* A layer of Mapbox Vector Tiles (MVT) from an XYZ tile service, drawn as an imagery layer (see
   MvtImageryProvider).

   It is drawn either with a Mapbox / MapLibre style (`styleUrl`), or with the built-in style,
   which the layer manager can change (LayerControlMvt). A drawn tile cannot be restyled, so a
   new style replaces the Cesium imagery layer with a new one at the same position.

   A click goes through the viewer's feature info: Cesium calls the provider's `pickFeatures`,
   after which FeatureInfoHandler calls `select` to highlight the feature.

   settings:
     url          URL template with {z}, {x} and {y}
     extent       [west, south, east, north] in degrees
     minZoom      shallowest level at which the service has tiles (default: from the style's
                  source, otherwise 0); zoomed out further, nothing is requested
     maxZoom      deepest level at which tiles are requested (default: from the style's source,
                  otherwise 18)
     styleUrl     Mapbox / MapLibre style (style.json); replaces the built-in style
     style        overrides of the built-in style (LayerStyle)
     geometryType geometry type of the features, e.g. "MultiPolygon"; decides which style
                  controls are shown
     properties   [{ name, kind }]: properties that can be used to colour the features
     classes      (property, kind) => Promise<DataDrivenStyle>: the colour classes of a property
                  over the whole dataset (a tile only holds what is in view); programmatic only
     headers      () => headers for each tile request, e.g. an API key; programmatic only */
export class MvtLayer extends CesiumImageryLayer {
	public style: Writable<LayerStyle>;
	public dataDriven: Writable<DataDrivenStyle | undefined>;

	private cache: TileCache = new globalThis.Map();
	private extent: [number, number, number, number] | undefined;
	private glStyle: GlStyle | undefined;
	private highlight: Cesium.ImageryLayer | undefined;
	/* Where a new imagery layer goes in the stack when it replaces the old one. */
	private insertAt: number | undefined;
	/* Style changes in quick succession (e.g. dragging a slider) are drawn in one go. */
	private rebuildTimer: ReturnType<typeof setTimeout> | undefined;
	private reportedError = false;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.style = writable({ ...nextLayerStyle(), ...config.settings["style"] });
		this.dataDriven = writable(undefined);

		const extent = (this.extent = degreesExtent(config.settings["extent"]));
		if (config.settings["extent"] && !extent) {
			console.warn(
				`MVT layer "${this.title}": extent ${JSON.stringify(config.settings["extent"])} is not in degrees; ignored.`
			);
		}
		if (extent) {
			/* For "zoom to layer" in the layer manager. */
			const sphere = Cesium.BoundingSphere.fromRectangle3D(Cesium.Rectangle.fromDegrees(...extent));
			this.map.options.use3DMode.subscribe((use3D) => {
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(sphere, use3D);
			});
		}

		if (config.settings["styleUrl"]) {
			void this.loadStyle(config.settings["styleUrl"]);
		} else {
			const control = new CustomLayerControl();
			control.component = LayerControlMvt;
			control.props = { layer: this };
			this.addCustomControl(control);
			/* Here and not in `startLoading`: the base class calls that before the fields above
			   exist. Nothing is requested while the layer is hidden anyway. */
			this.createLayer();
		}
	}

	/* The imagery layer is only created once the style has loaded: until then it is not known
	   which zoom levels have data, and nothing could be drawn anyway. */
	private async loadStyle(url: string): Promise<void> {
		try {
			/* The sprite image (the icons) arrives after the style: then draw again. */
			this.glStyle = await loadGlStyle(url, () => this.rebuild());
		} catch (error) {
			console.error(
				`MVT layer "${this.title}": style could not be loaded; default style used.`,
				error
			);
		}
		this.createLayer();
	}

	public createLayer(): void {
		this.source = this.buildLayer(this.currentStyle(), true);
	}

	/* See the constructor. */
	protected startLoading(): void {}

	public get properties(): MvtProperty[] {
		return this.config.settings["properties"] ?? [];
	}

	/** Whether the layer may draw points: when it has them, or its geometry type is unknown. */
	public get drawsPoints(): boolean {
		const type = String(this.config.settings["geometryType"] ?? "");
		return type === "" || /point|^geometry/i.test(type);
	}

	/** Whether the layer has only points: then the outline settings are those of the points. */
	public get onlyPoints(): boolean {
		return /point/i.test(String(this.config.settings["geometryType"] ?? ""));
	}

	/* --- Style ---------------------------------------------------------------------------- */

	public setStyle(patch: Partial<LayerStyle>): void {
		this.style.update((style) => ({ ...style, ...patch }));
		this.rebuild();
	}

	/* Colour the features by a property; `undefined` restores the base colour. */
	public setDataDrivenStyle(style: DataDrivenStyle | undefined): void {
		this.dataDriven.set(style);
		this.rebuild();
	}

	/* Colour by a property, with the classes from `settings.classes`. */
	public async colorBy(property: string | undefined): Promise<DataDrivenStyle | undefined> {
		if (!property) {
			this.setDataDrivenStyle(undefined);
			return undefined;
		}
		const kind = this.properties.find((candidate) => candidate.name === property)?.kind;
		if (!kind) throw new Error(`"${this.title}" has no property "${property}".`);
		const classes = this.config.settings["classes"];
		if (!classes)
			throw new Error(`"${this.title}" cannot be coloured by property: no classes are available.`);
		const style: DataDrivenStyle = await classes(property, kind);
		this.setDataDrivenStyle(style);
		return style;
	}

	private currentStyle(): StyleFunction {
		return this.glStyle?.style ?? createStyleFunction(get(this.style), get(this.dataDriven));
	}

	/* --- Highlight ------------------------------------------------------------------------ */

	/* Highlight a feature found by a click, with an imagery layer of its own on top. */
	public select(feature: Cesium.ImageryLayerFeatureInfo): void {
		const key = feature.data?.key;
		if (key === undefined) return;
		this.clearSelection();
		const color = get(this.map.featureInfo.selectedFeatureColor);
		this.highlight = this.buildLayer(createHighlightStyleFunction(featureKey, key, color), false);
		this.map.viewer.imageryLayers.add(this.highlight);
		this.map.refresh();
	}

	public clearSelection(): void {
		if (!this.highlight) return;
		this.map.viewer.imageryLayers.remove(this.highlight, true);
		this.highlight = undefined;
		this.map.refresh();
	}

	/* --- Imagery layer -------------------------------------------------------------------- */

	private buildLayer(style: StyleFunction, pickable: boolean): Cesium.ImageryLayer {
		const settings = this.config.settings;
		const provider = new MvtImageryProvider({
			url: settings["url"],
			headers: settings["headers"],
			style,
			cache: this.cache,
			extent: this.extent,
			minimumDataLevel: settings["minZoom"] ?? this.glStyle?.minZoom,
			maximumLevel: settings["maxZoom"] ?? this.glStyle?.maxZoom,
			pickable,
			onError: (error) => {
				/* Once per layer: when the server is down, every tile fails. */
				if (!this.reportedError) console.error(`MVT layer "${this.title}":`, error);
				this.reportedError = true;
			}
		});
		return new Cesium.ImageryLayer(provider as unknown as Cesium.ImageryProvider, {
			alpha: this.getOpacity(get(this.opacity)),
			show: get(this.visible)
		});
	}

	/* Replace the imagery layer with one in the current style, at the same position. */
	private rebuild(): void {
		clearTimeout(this.rebuildTimer);
		this.rebuildTimer = setTimeout(() => {
			const layers = this.map.viewer.imageryLayers;
			const index = layers.indexOf(this.source);
			if (index < 0) return; // not on the map
			layers.remove(this.source, true);
			this.insertAt = index;
			this.createLayer(); // adds it, through addToMap
		}, 250);
	}

	public addToMap(): void {
		const index = this.insertAt ?? (this.config.isBackground ? 0 : undefined);
		this.insertAt = undefined;
		this.map.viewer.imageryLayers.add(this.source, index);
		get(this.visible) ? this.show() : this.hide();
	}

	public removeFromMap(): void {
		clearTimeout(this.rebuildTimer); // it would add the layer again
		this.clearSelection();
		super.removeFromMap();
	}

	/* What is hidden cannot be selected. */
	public hide(): void {
		super.hide();
		this.clearSelection();
	}
}
