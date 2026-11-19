import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";

import { CesiumImageryLayer } from "./imagery-layer";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import {
	LruCache,
	MvtImageryProvider,
	featureKey,
	type FeatureCache
} from "../providers/mvt-imagery-provider";
import {
	createHighlightStyleFunction,
	createStyleFunction,
	nextLayerStyle,
	type DataDrivenStyle,
	type LayerStyle
} from "../providers/mvt-style";
import { CustomLayerControl } from "$lib/map-core/custom-layer-control";
import LayerControlMvt from "$lib/components/layer-controls/LayerControlMvt/LayerControlMvt.svelte";

import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";

export interface MvtProperty {
	name: string;
	kind: "number" | "text";
}

/* [west, south, east, north] if the value is a valid extent in degrees, otherwise undefined.
   An extent in another CRS (e.g. RD in metres) makes Cesium fail while computing the camera
   position, after which the layer cannot even be added. */
function degreesExtent(value: unknown): [number, number, number, number] | undefined {
	if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite))
		return undefined;
	const [west, south, east, north] = value as number[];
	const valid =
		-180 <= west && west <= east && east <= 180 && -90 <= south && south <= north && north <= 90;
	return valid ? [west, south, east, north] : undefined;
}

/* A layer of Mapbox Vector Tiles (MVT) from an XYZ tile service, drawn as an imagery layer
   (see MvtImageryProvider).

   - Style: `setStyle` (colours, line width, point size) and `colorBy` / `setDataDrivenStyle`
     (colour by property). A tile is fixed once drawn, so a new style means a new imagery
     layer at the same position in the stack.
   - Selection: a click goes through the viewer's feature info (Cesium calls the provider's
     `pickFeatures`), which calls `select`; `selected` holds the key of the selected feature.

   settings:
     url          URL template with {z}, {x} and {y}
     headers      () => headers for each tile request (e.g. an API key); a function, so the
                  value does not show up in the visible layer settings (programmatic only)
     extent       [west, south, east, north] in degrees
     maxZoom      deepest level at which tiles are requested (default 18)
     detail       how many levels finer than the globe this layer picks its tiles (0-3,
                  default 1); affects only this layer, not the terrain or 3D tiles
     geometryType geometry type of the features (e.g. "MultiPolygon"); decides which style
                  controls are shown
     properties   [{ name, kind }] - properties that can be used to colour the features
     classes      (property, kind) => Promise<DataDrivenStyle>: the colour classes for a
                  property over the whole dataset (a tile only holds what is in view); needed
                  for `colorBy` (programmatic only)
     style        partial LayerStyle that overrides the default style
   Other keys are left alone. */
export class MvtLayer extends CesiumImageryLayer {
	public style: Writable<LayerStyle>;
	public dataDriven: Writable<DataDrivenStyle | undefined>;
	/* The key of the selected feature, or undefined. */
	public selected: Writable<string | undefined>;

	private featureCache: FeatureCache;
	private highlight: Cesium.ImageryLayer | undefined;
	/* Where the new imagery layer goes in the stack once the old one has been replaced. */
	private insertAt: number | undefined;
	private reportedError = false;
	/* A style change rebuilds the imagery layer; changes in quick succession (dragging a
	   slider, several settings at once) are applied together in one rebuild. The stores
	   (`style`, `dataDriven`) update immediately, only the redraw waits. */
	private rebuildTimer: ReturnType<typeof setTimeout> | undefined;
	private static readonly REBUILD_DELAY_MS = 250;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.style = writable({ ...nextLayerStyle(), ...config.settings["style"] });
		this.dataDriven = writable(undefined);
		this.selected = writable(undefined);
		this.featureCache = new LruCache(300);

		const extent = degreesExtent(config.settings["extent"]);
		if (config.settings["extent"] && !extent) {
			console.warn(
				`Layer "${config.title}": extent ${JSON.stringify(config.settings["extent"])} is not in degrees; ignored.`
			);
		}
		if (extent) {
			/* So that "fly to" works, as with other layers in the layer manager. */
			const sphere = Cesium.BoundingSphere.fromRectangle3D(Cesium.Rectangle.fromDegrees(...extent));
			this.map.options.use3DMode.subscribe((use3D) => {
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(sphere, use3D);
			});
		}

		const control = new CustomLayerControl();
		control.component = LayerControlMvt;
		control.props = { layer: this };
		this.addCustomControl(control);

		/* Not in `startLoading`: the base class constructor already calls that, before the
		   fields above exist. An imagery layer requests nothing while it is hidden anyway. */
		this.createLayer();
	}

	public createLayer(): void {
		this.source = this.buildLayer();
	}

	/* See createLayer: this already happens in the constructor. */
	protected startLoading(): void {}

	public get properties(): MvtProperty[] {
		return this.config.settings["properties"] ?? [];
	}

	/** Whether the layer draws points (or might, when the geometry type is mixed or unknown). */
	public get drawsPoints(): boolean {
		const type = String(this.config.settings["geometryType"] ?? "");
		return type === "" || /point/i.test(type) || /^geometry/i.test(type);
	}

	/** Only points (no lines or polygons): their outline is pointStroke*. */
	public get onlyPoints(): boolean {
		return /point/i.test(String(this.config.settings["geometryType"] ?? ""));
	}

	/* --- Style ------------------------------------------------------------------------ */

	public setStyle(patch: Partial<LayerStyle>): void {
		this.style.update((style) => ({ ...style, ...patch }));
		this.rebuild();
	}

	/* Colour the features by a property; `undefined` restores the base colour. */
	public setDataDrivenStyle(style: DataDrivenStyle | undefined): void {
		this.dataDriven.set(style);
		this.rebuild();
	}

	/* Colour by a property, with classes over the whole dataset (`settings.classes`). */
	public async colorBy(property: string | undefined): Promise<DataDrivenStyle | undefined> {
		if (!property) {
			this.setDataDrivenStyle(undefined);
			return undefined;
		}
		const kind = this.properties.find((candidate) => candidate.name === property)?.kind;
		if (!kind) throw new Error(`"${this.title}" has no property "${property}".`);
		const classes = this.config.settings["classes"] as
			| ((property: string, kind: string) => Promise<DataDrivenStyle>)
			| undefined;
		if (!classes)
			throw new Error(
				`"${this.title}" cannot be coloured by property: no classification is available.`
			);
		const style = await classes(property, kind);
		this.setDataDrivenStyle(style);
		return style;
	}

	/* --- Selection -------------------------------------------------------------------- */

	/* Highlight the feature Cesium found on a click (see MvtImageryProvider.pickFeatures). */
	public select(feature: Cesium.ImageryLayerFeatureInfo): void {
		const key = feature.data?.key;
		if (key === undefined) return;
		this.clearSelection();

		const color = get(this.map.featureInfo.selectedFeatureColor);
		const layers = this.map.viewer.imageryLayers;
		/* A provider of its own, because the style is baked into what it draws; the decoded
		   tiles are shared, so this fetches nothing again. No config_id: this is not the layer
		   itself. */
		const provider = this.createProvider(
			createHighlightStyleFunction(featureKey, key, color),
			false
		);
		this.highlight = new Cesium.ImageryLayer(provider as unknown as Cesium.ImageryProvider);
		layers.add(this.highlight);
		layers.raiseToTop(this.highlight);
		this.selected.set(key);
		this.map.refresh();
	}

	public clearSelection(): void {
		if (!this.highlight) return;
		this.map.viewer.imageryLayers.remove(this.highlight, true);
		this.highlight = undefined;
		this.selected.set(undefined);
		this.map.refresh();
	}

	/* --- Layer on the map ------------------------------------------------------------- */

	private createProvider(
		style: ReturnType<typeof createStyleFunction>,
		pickable: boolean
	): MvtImageryProvider {
		const settings = this.config.settings;
		return new MvtImageryProvider({
			url: settings["url"],
			headers: settings["headers"],
			style,
			featureCache: this.featureCache,
			extent: degreesExtent(settings["extent"]),
			maximumLevel: settings["maxZoom"],
			detail: settings["detail"],
			pickable,
			onError: (error) => {
				/* One message per layer: otherwise every tile fails when the server is down. */
				if (this.reportedError) return;
				this.reportedError = true;
				console.error(`MVT layer "${this.title}":`, error);
			}
		});
	}

	private buildLayer(): Cesium.ImageryLayer {
		const provider = this.createProvider(
			createStyleFunction(get(this.style), get(this.dataDriven)),
			true
		);
		return new Cesium.ImageryLayer(provider as unknown as Cesium.ImageryProvider, {
			alpha: this.getOpacity(get(this.opacity)),
			show: get(this.visible)
		});
	}

	private rebuild(): void {
		clearTimeout(this.rebuildTimer);
		this.rebuildTimer = setTimeout(() => {
			this.rebuildTimer = undefined;
			this.rebuildNow();
		}, MvtLayer.REBUILD_DELAY_MS);
	}

	/* A new style: a new imagery layer in the place of the old one. */
	private rebuildNow(): void {
		const layers = this.map.viewer.imageryLayers;
		const index = layers.indexOf(this.source);
		if (index >= 0) {
			layers.remove(this.source, true);
			this.insertAt = index;
		}
		this.source = this.buildLayer();
	}

	/* Unlike the base class: in the place of a replaced layer, not on top. */
	public addToMap(): void {
		const layers = this.map.viewer.imageryLayers;
		const index = this.insertAt ?? (this.config.isBackground ? 0 : undefined);
		this.insertAt = undefined;
		if (index === undefined) layers.add(this.source);
		else layers.add(this.source, index);
		get(this.visible) ? this.show() : this.hide();
	}

	public removeFromMap(): void {
		/* A pending rebuild would otherwise add the layer again (a new source is attached to
		   the map automatically). */
		clearTimeout(this.rebuildTimer);
		this.rebuildTimer = undefined;
		this.clearSelection();
		super.removeFromMap();
	}

	/* What is hidden cannot be selected. */
	public hide(): void {
		super.hide();
		if (this.source) this.clearSelection();
	}
}
