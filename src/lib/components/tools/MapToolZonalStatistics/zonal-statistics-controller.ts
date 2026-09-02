import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";

import type { Map as CesiumMap } from "$lib/map-cesium/map";
import type { MouseLocation } from "$lib/map-core/mouse-location";
import type { GeoJsonLayer } from "$lib/map-cesium/layers/geojson-layer";
import type { ZonalColumn, ZonalColumnSource, ZonalStatisticsSettings } from "./zonal-config";

/**
 * A single selected zone (e.g. one PC6 area).
 */
export interface SelectedZone {
	/** Stable identifier of the zone (its code, e.g. the PC6 code). */
	code: string;
}

/** One row of the zone table (one configured data layer). */
export interface ZoneTableRow {
	/** Config id of the data layer. */
	layerId: string;
	/** Human readable title shown as the row label. */
	title: string;
	/** zone code -> per-column display values (aligned to `settings.columns`). */
	values: Record<string, Array<string | undefined>>;
	/** zone code -> per-column tooltip texts (aligned to `settings.columns`). */
	tooltips: Record<string, Array<string | undefined>>;
}

/** The full zone table model consumed by the view. */
export interface ZoneTable {
	/** Selected zone codes, in selection order (the table columns groups). */
	zones: Array<string>;
	/** One row per visible data layer. */
	rows: Array<ZoneTableRow>;
}

/**
 * One flattened export row for the zone table.
 * Each selected zone and data-layer row combination becomes one export row.
 */
export interface ZonalStatisticsExportRow {
	zoneCode: string;
	layerTitle: string;
	/** Display value per configured column, aligned to `settings.columns`. */
	values: Array<string>;
	/** Tooltip/description per configured column, aligned to `settings.columns`. */
	tooltips: Array<string>;
}

export interface ResolvedDataLayer {
	layerId: string;
	title: string;
	layer: GeoJsonLayer;
}

/** Per-instance pick id carried by each fill polygon part (all parts of a zone share a code). */
interface ZoneInstanceId {
	code: string;
}

/** Bookkeeping for the single batched fill primitive shared by every configured layer. */
interface ZoneFillRender {
	primitive: Cesium.Primitive;
	/** zone code -> the instance ids of its polygon parts. */
	idsByCode: Map<string, Array<ZoneInstanceId>>;
	/** zone code -> its current base colour, read from the colour-source layer. */
	baseColor: Map<string, Cesium.Color>;
}

/** One configured layer the tool draws/colours the shared fill primitive from. */
interface TrackedLayer {
	id: string;
	layer: GeoJsonLayer;
}

/** Lower-cased attribute texts that mean "no tooltip" rather than actual content. */
const PLACEHOLDER_TEXTS = new Set(["null", "nan", "undefined"]);

/**
 * Owns all non-UI logic for the Zonal Statistics tool: resolving the
 * configured zone + data layers, ensuring their data is loaded, handling map
 * clicks to (de)select zones, highlighting the selection, and building the
 * zone table. UI components subscribe to the exposed stores.
 */
export class ZonalStatisticsController {
	// State colours layered over each zone's base label fill. Selected + hover brighten the base
	// (selected less than hover); active blends towards a tint. All preserve the base opacity.
	private static readonly ACTIVE_TINT = Cesium.Color.DEEPSKYBLUE;
	private static readonly ACTIVE_TINT_AMOUNT = 0.8;
	private static readonly SELECTED_BRIGHTEN = 0.5;
	private static readonly HOVER_BRIGHTEN = 0.3;
	// Zone-boundary outline colours. The black base outline's alpha tracks the zone layer's opacity
	// slider; the selected/active highlights stay opaque and are drawn as thick polylines on top.
	private static readonly OUTLINE_COLOR = Cesium.Color.BLACK;
	private static readonly SELECTED_OUTLINE_COLOR = Cesium.Color.YELLOW;
	private static readonly ACTIVE_OUTLINE_COLOR = Cesium.Color.DEEPSKYBLUE;
	// GL line width is capped at 1px on most platforms, so the highlights are polylines (ribbons).
	private static readonly HIGHLIGHT_WIDTH = 2;
	// Shared across every entity of every configured layer: a ConstantProperty carries no owner
	// state, so hiding thousands of polygons costs two allocations instead of two per entity.
	private static readonly HIDDEN = new Cesium.ConstantProperty(false);
	private static readonly SHOWN = new Cesium.ConstantProperty(true);

	private readonly map: CesiumMap;
	public readonly settings: ZonalStatisticsSettings;

	/** Whether the tool is active and should react to map clicks. */
	public readonly active: Writable<boolean> = writable(false);
	/** Currently selected zones, in selection order. */
	public readonly selectedZones: Writable<Array<SelectedZone>> = writable([]);

	private zoneLayer: GeoJsonLayer | undefined;
	/** Zone code -> zone-layer entities. A MultiPolygon zone becomes multiple entities (one per
	 * part) that share the same code. Used to validate picks and compute area. */
	private readonly zoneEntityIndex: Map<string, Array<Cesium.Entity>> = new Map();
	/** Zone-layer entity -> its zone code, resolved once so building the fill/outlines is cheap. */
	private readonly entityCodeIndex: Map<Cesium.Entity, string> = new Map();
	/** Per layer id: zone code -> its opaque fill RGB (the alpha comes from the layer's opacity). */
	private readonly colorIndex: Map<string, Map<string, Cesium.Color>> = new Map();
	/** Resolved data layers per config id, in config order. */
	private readonly dataLayers: Array<ResolvedDataLayer> = [];
	/** Resolved data layers exposed to the zonal panel UI. */
	public readonly resolvedDataLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** Id of the single data layer drawn on the map (the panel's radio selection). */
	public readonly selectedLayerId: Writable<string | undefined> = writable(undefined);
	/** Data layers added to the table, in the order the user added them; drives the table + exports. */
	public readonly tableLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** True while `initialize()` is resolving the configured layers. */
	public readonly loading: Writable<boolean> = writable(false);
	/** Ids of the data layers whose GeoJSON is being fetched/indexed right now. */
	public readonly loadingLayerIds: Writable<Set<string>> = writable(new Set());
	/** Bumped whenever a data layer finished indexing, so the table can refill its cells. */
	public readonly dataVersion: Writable<number> = writable(0);
	/** Dismiss notification after reopening the tool. */
	public readonly instructionsDismissed: Writable<boolean> = writable(false);
	/** Per data layer: its load+index promise, so each layer is fetched at most once. */
	private readonly layerLoads: Map<string, Promise<void>> = new Map();
	/** Serialises the on-demand loads so "add all" can never fetch + parse every layer at once. */
	private loadQueue: Promise<void> = Promise.resolve();
	/** Per data-layer index: zone code -> feature properties (only the attributes the table reads). */
	private readonly valueIndex: Map<string, Map<string, Record<string, any>>> = new Map();
	/** Per layer id: column key -> the source attributes that layer reads for that column. */
	private readonly columnSources: Map<string, Map<string, ZonalColumnSource>> = new Map();

	/** The single batched fill primitive covering every zone, shared by all configured layers. */
	private zoneFill: ZoneFillRender | undefined;
	/** Zone + data layers whose visibility/colours feed the shared fill primitive, zone layer first. */
	private readonly trackedLayers: Array<TrackedLayer> = [];
	/** Id of the layer the shared fill primitive currently takes its colours from. */
	private colorLayerId: string | undefined;
	/** Removes the postRender listener that repaints once asynchronous geometry creation finished. */
	private paintWhenReady: (() => void) | undefined;
	/** Single batched primitive outlining every zone boundary (added on top of the fills). */
	private zoneOutlinePrimitive: Cesium.Primitive | undefined;
	/** Per-instance ids of the outline primitive, used to rescale their alpha with layer opacity. */
	private readonly zoneOutlineIds: Array<object> = [];
	/** Batched polyline primitive drawing the thick outlines of the selected + active zones. */
	private zoneHighlightPrimitive: Cesium.Primitive | undefined;
	/** Whether a coalesced highlight rebuild is already queued for this tick. */
	private highlightRebuildPending = false;
	/** Store/event unsubscribers for the fill primitives (visible/opacity/style/active). */
	private readonly unsubscribers: Array<Unsubscriber> = [];
	/** Attribute the zone layer's `classMapping` keys off (its configured `style`), if any. */
	private classAttribute: string | undefined;
	/** The column that attribute belongs to, so each layer's own name for it can be resolved. */
	private classColumn: ZonalColumn | undefined;
	/** Zone-layer `classMapping` value -> colour, applied to every layer so all fills match. */
	private readonly classColors: Map<string, Cesium.Color> = new Map();
	/** The zone currently shown in the table (drawn with the strongest tint). */
	private activeCode: string | undefined;
	/** The zone currently under the mouse (brightened), or undefined. */
	private hoveredCode: string | undefined;
	private clickHandler: ((l: MouseLocation) => void) | undefined;
	private moveHandler: ((l: MouseLocation) => void) | undefined;

	constructor(map: CesiumMap, settings: ZonalStatisticsSettings) {
		this.map = map;
		this.settings = settings;
		for (const layer of settings.layers) {
			if (!layer.columns) continue;
			this.columnSources.set(layer.id, new Map(Object.entries(layer.columns)));
		}
	}

	/** Stable id a per-layer column override is keyed by. */
	private static columnKey(column: ZonalColumn): string {
		return column.key ?? column.attribute;
	}

	/** The attribute `layerId` holds this column's value in (its override, else the column default). */
	private attributeFor(layerId: string, column: ZonalColumn): string {
		const source = this.columnSources.get(layerId)?.get(ZonalStatisticsController.columnKey(column));
		return source?.attribute ?? column.attribute;
	}

	/** The attribute `layerId` holds this column's tooltip in; overrides apply independently. */
	private tooltipAttributeFor(layerId: string, column: ZonalColumn): string | undefined {
		const source = this.columnSources.get(layerId)?.get(ZonalStatisticsController.columnKey(column));
		return source?.tooltipAttribute ?? column.tooltipAttribute;
	}

	/** Distinct attributes to read out of `layerId`'s features for the table + tooltips. */
	private attributesFor(layerId: string): Array<string> {
		const attrs = new Set<string>();
		for (const column of this.settings.columns) {
			attrs.add(this.attributeFor(layerId, column));
			const tooltip = this.tooltipAttributeFor(layerId, column);
			if (tooltip) attrs.add(tooltip);
		}
		return [...attrs];
	}

	/** The attribute `layerId` holds the shared `classMapping` value in. */
	private classAttributeFor(layerId: string): string | undefined {
		if (!this.classAttribute) return undefined;
		return this.classColumn ? this.attributeFor(layerId, this.classColumn) : this.classAttribute;
	}

	/**
	 * Load + index the zone layer (the tool's geometry), resolve the configured data layers without
	 * loading them, and start listening for clicks. Data layers are fetched lazily by
	 * `ensureLayerReady()` the first time they are selected or added to the table.
	 */
	public async initialize(): Promise<void> {
		const zone = this.map.getLayerById(this.settings.zoneLayerId) as GeoJsonLayer | undefined;
		if (!zone) {
			console.warn(
				`zonalStatistics: zone layer '${this.settings.zoneLayerId}' not found in map layers`
			);
			return;
		}
		this.loading.set(true);
		try {
			this.zoneLayer = zone;
			await this.ensureLoaded(zone);
			// Before indexing: the zone colours are snapshotted through the shared class mapping.
			this.buildClassColors();
			this.indexZoneEntities();

			for (const cfg of this.settings.layers) {
				const layer = this.map.getLayerById(cfg.id) as GeoJsonLayer | undefined;
				if (!layer) {
					console.warn(`zonalStatistics: data layer '${cfg.id}' not found in map layers`);
					continue;
				}
				this.dataLayers.push({
					layerId: cfg.id,
					title: cfg.title ?? layer.config.title,
					layer
				});
			}
			this.resolvedDataLayers.set([...this.dataLayers]);

			this.buildZoneFill();
			// Added after the fill so the boundary lines draw on top of it.
			this.buildZoneOutlines();

			this.clickHandler = (l: MouseLocation) => this.onMapClick(l);
			this.map.on("mouseLeftClick", this.clickHandler as (n: unknown) => unknown);
			this.moveHandler = (l: MouseLocation) => this.onMouseMove(l);
			this.map.on("mouseMove", this.moveHandler as (n: unknown) => unknown);
			this.unsubscribers.push(
				this.active.subscribe((active) => {
					if (!active) this.clearHover();
				})
			);
		} finally {
			this.loading.set(false);
		}
	}

	/**
	 * Fetch + index one data layer, at most once. Only the feature **properties** are read: the data
	 * layers are attribute joins on the zone code, so their geometry is a duplicate of the zone
	 * layer's and is deliberately never turned into Cesium entities — doing so kept a full copy of
	 * every polygon alive per layer and ran the tab out of memory after a handful of layers. The
	 * loads are queued so they can never run in parallel.
	 */
	public ensureLayerReady(layerId: string): Promise<void> {
		const running = this.layerLoads.get(layerId);
		if (running) return running;
		const dl = this.dataLayers.find((l) => l.layerId === layerId);
		if (!dl) return Promise.resolve();
		// The zone layer carries the geometry and is already loaded + indexed by `initialize()`.
		if (layerId === this.settings.zoneLayerId) return Promise.resolve();

		this.markLayerLoading(layerId, true);
		const load = this.loadQueue.then(async () => {
			try {
				await this.indexLayerProperties(layerId, dl.layer);
			} finally {
				this.markLayerLoading(layerId, false);
			}
			this.refreshColorSource(layerId);
			this.dataVersion.update((version) => version + 1);
		});
		// Swallow the failure on the queue only, so one broken layer cannot stall the others.
		this.loadQueue = load.catch(() => undefined);
		this.layerLoads.set(layerId, load);
		return load;
	}

	private markLayerLoading(layerId: string, loading: boolean): void {
		this.loadingLayerIds.update((ids) => {
			const next = new Set(ids);
			if (loading) next.add(layerId);
			else next.delete(layerId);
			return next;
		});
	}

	/**
	 * Draw the picked layer's values on the shared zone geometry. Visibility of the data layers is
	 * deliberately not touched: switching a GeoJson layer on would make Cesium parse its (redundant)
	 * geometry. The previously picked layer stays drawn until the new one has loaded.
	 */
	public selectLayer(layerId: string): void {
		this.selectedLayerId.set(layerId);
		void this.applySelection(layerId);
	}

	private async applySelection(layerId: string): Promise<void> {
		await this.ensureLayerReady(layerId);
		// The user may have picked another layer while this one was loading.
		if (get(this.selectedLayerId) !== layerId) return;
		this.syncFillSource();
	}

	/** Add a data layer's row to the table (no-op when it is already there). */
	public addTableLayer(layerId: string): void {
		if (this.isTableLayer(layerId)) return;
		const dl = this.dataLayers.find((l) => l.layerId === layerId);
		if (!dl) return;
		this.tableLayers.set([...get(this.tableLayers), dl]);
		void this.ensureLayerReady(layerId);
	}

	/** Remove a data layer's row from the table. */
	public removeTableLayer(layerId: string): void {
		this.tableLayers.set(get(this.tableLayers).filter((dl) => dl.layerId !== layerId));
	}

	/** Give every resolved data layer a row in the table, in config order. */
	public addAllTableLayers(): void {
		this.tableLayers.set([...this.dataLayers]);
		for (const dl of this.dataLayers) void this.ensureLayerReady(dl.layerId);
	}

	/** Whether a data layer currently has a row in the table. */
	public isTableLayer(layerId: string): boolean {
		return get(this.tableLayers).some((dl) => dl.layerId === layerId);
	}

	/** Empty the table (keeps the map selection untouched). */
	public clearTableLayers(): void {
		this.tableLayers.set([]);
	}

	/** Ensure a layer's data is loaded without toggling its visibility. */
	private async ensureLoaded(layer: GeoJsonLayer): Promise<void> {
		try {
			await layer.ensureLoaded();
		} catch (error) {
			console.error(`zonalStatistics: failed to load layer '${layer.config.id}'`, error);
		}
	}

	/**
	 * Build the ONE batched fill primitive that every configured layer shares. The data layers are
	 * attribute joins on the zone code, so they all carry the same geometry as the zone layer:
	 * triangulating and uploading it once and merely repainting the per-instance colours when the
	 * user picks another layer keeps load time and GPU memory independent of how many layers the
	 * tool is configured with. The zone layer's own GeoJson entity fills are hidden so only this
	 * primitive renders. No terrain is assumed, so the polygons sit flat at height 0.
	 */
	private buildZoneFill(): void {
		this.trackedLayers.length = 0;
		if (this.zoneLayer) {
			this.trackedLayers.push({ id: this.settings.zoneLayerId, layer: this.zoneLayer });
		}
		for (const dl of this.dataLayers) {
			if (dl.layerId === this.settings.zoneLayerId) continue;
			this.trackedLayers.push({ id: dl.layerId, layer: dl.layer });
		}

		const source = this.zoneLayer?.source;
		if (!source) return;
		this.colorLayerId = this.resolveColorLayerId();
		const time = this.map.viewer.clock.currentTime;
		const idsByCode = new Map<string, Array<ZoneInstanceId>>();
		const baseColor = new Map<string, Cesium.Color>();
		const instances: Array<Cesium.GeometryInstance> = [];

		for (const entity of source.entities.values) {
			const code = this.entityCodeIndex.get(entity);
			if (code === undefined) continue;
			const hierarchy = entity.polygon?.hierarchy?.getValue(time) as
				| Cesium.PolygonHierarchy
				| undefined;
			if (!hierarchy || hierarchy.positions.length < 3) continue;
			let color = baseColor.get(code);
			if (!color) {
				color = this.baseColorFor(code);
				baseColor.set(code, color);
			}
			// Unique id object per part carrying the shared zone code (for picking + per-part recolour).
			const id: ZoneInstanceId = { code };
			instances.push(
				new Cesium.GeometryInstance({
					geometry: new Cesium.PolygonGeometry({
						polygonHierarchy: hierarchy,
						vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
						height: 0,
						perPositionHeight: false
					}),
					attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(color) },
					id
				})
			);
			const list = idsByCode.get(code) ?? [];
			list.push(id);
			idsByCode.set(code, list);
		}
		if (instances.length === 0) return;

		const primitive = new Cesium.Primitive({
			geometryInstances: instances,
			appearance: new Cesium.PerInstanceColorAppearance({
				translucent: true,
				closed: false,
				// Disable the depth test so the flat fills draw over the globe instead of clipping into it.
				renderState: { depthTest: { enabled: false } }
			}),
			allowPicking: true,
			asynchronous: true,
			releaseGeometryInstances: false
		});
		primitive.show = this.zoneLayer ? get(this.zoneLayer.visible) : false;
		this.map.viewer.scene.primitives.add(primitive);
		this.zoneFill = { primitive, idsByCode, baseColor };

		// Only the zone layer has entities; the data layers are never materialised in Cesium.
		if (this.zoneLayer) {
			this.hideEntityFills(this.zoneLayer);
			this.unsubscribers.push(
				this.zoneLayer.visible.subscribe(() => this.syncFillSource()),
				// The GeoJson layer updates its entity materials first on a style change, so re-reading
				// here picks up the fresh colours before repainting the primitive.
				this.zoneLayer.style.subscribe(() => this.restyleZoneColors()),
				this.zoneLayer.legend.subscribe(() => this.restyleZoneColors())
			);
		}
		for (const tracked of this.trackedLayers) {
			this.unsubscribers.push(
				tracked.layer.opacity.subscribe(() => this.refreshColorSource(tracked.id))
			);
		}
		this.unsubscribers.push(this.selectedLayerId.subscribe(() => this.syncFillSource()));
	}

	/** Re-snapshot the zone layer's entity colours after it was restyled. */
	private restyleZoneColors(): void {
		this.indexZoneColors();
		this.refreshColorSource(this.settings.zoneLayerId);
	}

	/** Mirror the zone layer's visibility onto the shared fill and re-resolve the colour source. */
	private syncFillSource(): void {
		const render = this.zoneFill;
		if (!render) return;
		const visible = this.zoneLayer ? get(this.zoneLayer.visible) : false;
		if (render.primitive.show !== visible) {
			render.primitive.show = visible;
			this.map.refresh();
		}
		const next = this.resolveColorLayerId();
		if (next === this.colorLayerId) return;
		this.colorLayerId = next;
		this.refreshBaseColors();
	}

	/**
	 * The layer whose values the shared primitive is coloured by: the panel's radio selection once
	 * it is indexed, otherwise whatever is drawn now, so the map keeps its colours while loading.
	 */
	private resolveColorLayerId(): string | undefined {
		const selected = get(this.selectedLayerId);
		// An indexed-but-empty colour map would repaint every zone transparent, leaving bare outlines.
		if (selected && (this.colorIndex.get(selected)?.size ?? 0) > 0) return selected;
		return this.colorLayerId ?? this.settings.zoneLayerId;
	}

	/** Re-read the colours after the colour-source layer changed its opacity/style. */
	private refreshColorSource(layerId: string): void {
		if (layerId === this.colorLayerId) this.refreshBaseColors();
	}

	/**
	 * Base fill colour for a zone: the colour-source layer's RGB at that layer's current opacity.
	 * Zones the layer has no feature (or no mapped class) for stay transparent.
	 */
	private baseColorFor(code: string): Cesium.Color {
		const layerId = this.colorLayerId;
		const rgb = layerId ? this.colorIndex.get(layerId)?.get(code) : undefined;
		return rgb ? rgb.withAlpha(this.colorLayerAlpha()) : Cesium.Color.TRANSPARENT;
	}

	/** Alpha of the colour-source layer, driven by its opacity slider (0…100 → 0…1). */
	private colorLayerAlpha(): number {
		const tracked = this.trackedLayers.find((t) => t.id === this.colorLayerId);
		const opacity = tracked ? get(tracked.layer.opacity) : 100;
		return Math.min(1, Math.max(0, opacity / 100));
	}

	/**
	 * Outline every zone boundary as a single batched `Primitive` of `PolygonOutlineGeometry`
	 * instances (one draw call, not thousands of entities), flat at height 0 with the depth test
	 * off so the lines sit on top of the fills. Only the zone layer is outlined (data layers share
	 * the same geometry). The outlines are structural to the tool: they are shown while the tool is
	 * open regardless of which layer the panel's radio has selected, and the line alpha tracks the
	 * zone layer's opacity slider.
	 */
	private buildZoneOutlines(): void {
		const source = this.zoneLayer?.source;
		if (!this.zoneLayer || !source) return;
		const time = this.map.viewer.clock.currentTime;
		const color = Cesium.ColorGeometryInstanceAttribute.fromColor(this.outlineColor());
		const instances: Array<Cesium.GeometryInstance> = [];
		this.zoneOutlineIds.length = 0;
		for (const entity of source.entities.values) {
			if (this.entityCodeIndex.get(entity) === undefined) continue;
			const hierarchy = entity.polygon?.hierarchy?.getValue(time) as
				| Cesium.PolygonHierarchy
				| undefined;
			if (!hierarchy || hierarchy.positions.length < 3) continue;
			const id = {};
			this.zoneOutlineIds.push(id);
			instances.push(
				new Cesium.GeometryInstance({
					geometry: new Cesium.PolygonOutlineGeometry({
						polygonHierarchy: hierarchy,
						height: 0,
						perPositionHeight: false
					}),
					attributes: { color },
					id
				})
			);
		}
		if (instances.length === 0) return;
		this.zoneOutlinePrimitive = new Cesium.Primitive({
			geometryInstances: instances,
			appearance: new Cesium.PerInstanceColorAppearance({
				flat: true,
				// Draw in the translucent pass (like the fills) so the outlines render *after* the
				// semi-transparent fills instead of being painted over by them in a later pass. At
				// equal (flat) depth Cesium's stable sort keeps this last-added primitive on top.
				translucent: true,
				renderState: { depthTest: { enabled: false } }
			}),
			allowPicking: false,
			asynchronous: true,
			releaseGeometryInstances: false
		});
		this.zoneOutlinePrimitive.show = get(this.active);
		this.map.viewer.scene.primitives.add(this.zoneOutlinePrimitive);
		this.unsubscribers.push(
			this.active.subscribe((active) => {
				if (this.zoneOutlinePrimitive) this.zoneOutlinePrimitive.show = active;
				this.map.refresh();
			}),
			this.zoneLayer.opacity.subscribe(() => this.applyOutlineOpacity())
		);
	}

	/** Outline colour with its alpha scaled to the zone layer's opacity slider (0…100 → 0…1). */
	private outlineColor(): Cesium.Color {
		const opacity = this.zoneLayer ? get(this.zoneLayer.opacity) : 100;
		const alpha = Math.min(1, Math.max(0, opacity / 100));
		return ZonalStatisticsController.OUTLINE_COLOR.withAlpha(alpha);
	}

	/** Rescale every outline instance's alpha to match the current zone-layer opacity. */
	private applyOutlineOpacity(): void {
		const primitive = this.zoneOutlinePrimitive;
		if (!primitive?.ready) return;
		const value = Cesium.ColorGeometryInstanceAttribute.toValue(this.outlineColor());
		for (const id of this.zoneOutlineIds) {
			const attributes = primitive.getGeometryInstanceAttributes(id);
			if (attributes) attributes.color = value;
		}
		this.map.refresh();
	}

	/**
	 * Draw the thick outlines of the zones that are in the table: yellow per selected zone, blue for
	 * the active one. Rebuilt on every selection change — unlike the base outline this covers only
	 * the handful of selected zones, so batching them into one short-lived polyline primitive is
	 * cheap. Polylines rather than `PolygonOutlineGeometry` because a geometry outline is a GL line,
	 * whose width browsers clamp to 1px.
	 */
	private rebuildHighlightOutlines(): void {
		const previous = this.zoneHighlightPrimitive;
		this.zoneHighlightPrimitive = undefined;
		const instances: Array<Cesium.GeometryInstance> = [];
		for (const zone of get(this.selectedZones)) {
			const color = Cesium.ColorGeometryInstanceAttribute.fromColor(
				zone.code === this.activeCode
					? ZonalStatisticsController.ACTIVE_OUTLINE_COLOR
					: ZonalStatisticsController.SELECTED_OUTLINE_COLOR
			);
			for (const ring of this.zoneRings(zone.code)) {
				instances.push(
					new Cesium.GeometryInstance({
						geometry: new Cesium.PolylineGeometry({
							positions: ring,
							width: ZonalStatisticsController.HIGHLIGHT_WIDTH,
							vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
							arcType: Cesium.ArcType.GEODESIC
						}),
						attributes: { color }
					})
				);
			}
		}
		if (instances.length > 0) {
			this.zoneHighlightPrimitive = new Cesium.Primitive({
				geometryInstances: instances,
				appearance: new Cesium.PolylineColorAppearance({
					// Same reasoning as the base outline: render in the translucent pass, after the fills.
					translucent: true,
					renderState: { depthTest: { enabled: false } }
				}),
				allowPicking: false,
				// Synchronous: a few zones' rings cost little to triangulate, while asynchronous creation
				// would leave the outlines missing for a frame or more on every selection change.
				asynchronous: false
			});
			// Added last, so it draws on top of both the fills and the black base outline.
			this.map.viewer.scene.primitives.add(this.zoneHighlightPrimitive);
		}
		if (previous) this.map.viewer.scene.primitives.remove(previous);
		this.map.refresh();
	}

	/**
	 * Coalesce the rebuild: one interaction changes both the selection and the active zone (the table
	 * reacts to the selection), which would otherwise rebuild the primitive twice and briefly draw
	 * the active zone in the selected colour.
	 */
	private scheduleHighlightRebuild(): void {
		if (this.highlightRebuildPending) return;
		this.highlightRebuildPending = true;
		queueMicrotask(() => {
			this.highlightRebuildPending = false;
			// The tool may have been destroyed in the meantime.
			if (this.zoneFill) this.rebuildHighlightOutlines();
		});
	}

	/** Closed boundary rings (outer + holes) of every polygon part of a zone. */
	private zoneRings(code: string): Array<Array<Cesium.Cartesian3>> {
		const time = this.map.viewer.clock.currentTime;
		const rings: Array<Array<Cesium.Cartesian3>> = [];
		const collect = (hierarchy: Cesium.PolygonHierarchy): void => {
			const positions = hierarchy.positions;
			if (positions?.length >= 3) {
				const first = positions[0];
				const last = positions[positions.length - 1];
				rings.push(Cesium.Cartesian3.equals(first, last) ? positions : [...positions, first]);
			}
			for (const hole of hierarchy.holes ?? []) collect(hole);
		};
		for (const entity of this.zoneEntityIndex.get(code) ?? []) {
			const hierarchy = entity.polygon?.hierarchy?.getValue(time) as
				| Cesium.PolygonHierarchy
				| undefined;
			if (hierarchy) collect(hierarchy);
		}
		return rings;
	}

	/**
	 * Read the zone layer's configured `style` attribute + `classMapping` so every layer in the tool
	 * renders the same value-to-colour scheme instead of each GeoJson layer's own (random) colours.
	 */
	private buildClassColors(): void {
		const settings = this.zoneLayer?.config.settings;
		const mapping = settings?.classMapping;
		if (typeof settings?.style !== "string" || !mapping || typeof mapping !== "object") return;
		for (const [value, color] of Object.entries(mapping as Record<string, unknown>)) {
			if (typeof color !== "string") continue;
			this.classColors.set(
				ZonalStatisticsController.normalizeClassValue(value),
				Cesium.Color.fromCssColorString(color)
			);
		}
		if (this.classColors.size === 0) return;
		this.classAttribute = settings.style;
		const zoneLayerId = this.settings.zoneLayerId;
		this.classColumn = this.settings.columns.find(
			(column) => this.attributeFor(zoneLayerId, column) === settings.style
		);
	}

	/**
	 * Read a zone-layer polygon entity's fill colour. The RGB comes from the shared `classMapping`
	 * when configured, otherwise from the entity's own material.
	 */
	private readEntityColor(entity: Cesium.Entity, time: Cesium.JulianDate): Cesium.Color {
		const material = entity.polygon?.material as Cesium.ColorMaterialProperty | undefined;
		const color = material?.color?.getValue?.(time);
		const base = color instanceof Cesium.Color ? color.clone() : Cesium.Color.GRAY.withAlpha(0.5);
		if (!this.classAttribute) return base;
		const value = this.readProperty(entity, this.classAttribute, time);
		const mapped = this.classColor(value);
		return mapped ? mapped.withAlpha(base.alpha) : base;
	}

	/** Hide a layer's GeoJson entity polygon fills so only the batched primitive renders. */
	private hideEntityFills(layer: GeoJsonLayer): void {
		for (const entity of layer.source?.entities?.values ?? []) {
			if (entity.polygon) entity.polygon.show = ZonalStatisticsController.HIDDEN;
		}
	}

	/** Restore a layer's GeoJson entity polygon fills (undo `hideEntityFills`). */
	private restoreEntityFills(layer: GeoJsonLayer): void {
		for (const entity of layer.source?.entities?.values ?? []) {
			if (entity.polygon) entity.polygon.show = ZonalStatisticsController.SHOWN;
		}
	}

	/** Recompute every zone's base colour from the current colour-source layer and repaint. */
	private refreshBaseColors(): void {
		const render = this.zoneFill;
		if (!render) return;
		for (const code of render.idsByCode.keys()) {
			render.baseColor.set(code, this.baseColorFor(code));
		}
		this.recolorFill();
	}

	/** Read a single entity property by name without materialising the whole property bag. */
	private readProperty(entity: Cesium.Entity, attribute: string, time: Cesium.JulianDate): any {
		const bag = entity.properties as unknown as
			| Record<string, { getValue(t: Cesium.JulianDate): any } | undefined>
			| undefined;
		return bag?.[attribute]?.getValue(time);
	}

	/**
	 * Join key for a zone code. The data layers are separate datasets keyed on the same code, so the
	 * key is case- and whitespace-insensitive (`"4331 ab"` and `"4331AB"` are the same zone).
	 */
	private static normalizeCode(code: unknown): string {
		return String(code).replace(/\s+/g, "").toUpperCase();
	}

	/** Lookup key for a `classMapping` value, matched case-insensitively across datasets. */
	private static normalizeClassValue(value: unknown): string {
		return String(value).trim().toUpperCase();
	}

	/** Shared `classMapping` colour for a raw feature/entity value, if it maps to one. */
	private classColor(value: unknown): Cesium.Color | undefined {
		if (value === undefined || value === null) return undefined;
		return this.classColors.get(ZonalStatisticsController.normalizeClassValue(value));
	}

	/** Build a zone-code -> zone-layer entity lookup for resolving click geometry. */
	private indexZoneEntities(): void {
		this.zoneEntityIndex.clear();
		const time = this.map.viewer.clock.currentTime;
		const codeAttr = this.settings.zoneCodeAttribute;
		const entities = this.zoneLayer?.source?.entities?.values ?? [];
		for (const entity of entities) {
			// Read only the code property instead of materialising every attribute per entity.
			const code = this.readProperty(entity, codeAttr, time);
			if (code !== undefined && code !== null) {
				const key = ZonalStatisticsController.normalizeCode(code);
				// A MultiPolygon zone becomes several entities under one code; keep them all.
				const list = this.zoneEntityIndex.get(key) ?? [];
				list.push(entity);
				this.zoneEntityIndex.set(key, list);
				this.entityCodeIndex.set(entity, key);
			}
		}
		this.indexZoneValues();
		this.indexZoneColors();
	}

	/** Index the zone layer's own attribute values so it can be used as a table row like any layer. */
	private indexZoneValues(): void {
		const time = this.map.viewer.clock.currentTime;
		const attributes = this.attributesFor(this.settings.zoneLayerId);
		const index = new Map<string, Record<string, any>>();
		for (const [code, entities] of this.zoneEntityIndex) {
			const entity = entities[0];
			const props: Record<string, any> = {};
			for (const attr of attributes) props[attr] = this.readProperty(entity, attr, time);
			index.set(code, props);
		}
		this.valueIndex.set(this.settings.zoneLayerId, index);
	}

	/** Snapshot the zone layer's entity fill colours; re-run when it is restyled. */
	private indexZoneColors(): void {
		const time = this.map.viewer.clock.currentTime;
		const colors = new Map<string, Cesium.Color>();
		for (const [code, entities] of this.zoneEntityIndex) {
			colors.set(code, this.readEntityColor(entities[0], time).withAlpha(1));
		}
		this.colorIndex.set(this.settings.zoneLayerId, colors);
	}

	/**
	 * Fetch a data layer's GeoJSON and index the attributes the table + fill colours need. Nothing
	 * else is kept: the parsed document (and its geometry) is dropped as soon as this returns.
	 */
	private async indexLayerProperties(layerId: string, layer: GeoJsonLayer): Promise<void> {
		const url = layer.config.settings?.url;
		if (typeof url !== "string" || url === "") {
			console.warn(`zonalStatistics: data layer '${layerId}' has no settings.url to index`);
			return;
		}
		let features: Array<any>;
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const geojson = await response.json();
			features = Array.isArray(geojson?.features) ? geojson.features : [];
		} catch (error) {
			console.error(`zonalStatistics: failed to load layer '${layerId}'`, error);
			return;
		}

		const codeAttr = this.settings.zoneCodeAttribute;
		const attributes = this.attributesFor(layerId);
		const classAttr = this.classAttributeFor(layerId);
		const index = new Map<string, Record<string, any>>();
		const colors = new Map<string, Cesium.Color>();
		for (const feature of features) {
			const properties = feature?.properties;
			const code = properties?.[codeAttr];
			if (code === undefined || code === null) continue;
			const key = ZonalStatisticsController.normalizeCode(code);
			// Store only the attributes the table + tooltips read, not the whole property bag.
			const props: Record<string, any> = {};
			for (const attr of attributes) props[attr] = properties[attr];
			index.set(key, props);
			const color = this.featureColor(key, properties, classAttr);
			if (color) colors.set(key, color);
		}
		if (colors.size === 0) {
			console.warn(
				`zonalStatistics: layer '${layerId}' produced no zone colours from ${features.length} features ` +
					`(check '${codeAttr}' matches the zone layer's codes and '${classAttr}' matches its classMapping)`
			);
		}
		this.valueIndex.set(layerId, index);
		this.colorIndex.set(layerId, colors);
	}

	/**
	 * Fill colour for a feature. Without Cesium entities the only colour source is the zone layer's
	 * shared `classMapping`, read from `classAttr` (this layer's own name for that column); when it
	 * yields nothing the zone layer's own colour for that zone is reused, so the geometry still
	 * renders instead of turning transparent.
	 */
	private featureColor(
		code: string,
		properties: Record<string, any>,
		classAttr: string | undefined
	): Cesium.Color | undefined {
		const mapped = classAttr ? this.classColor(properties[classAttr]) : undefined;
		return mapped ?? this.colorIndex.get(this.settings.zoneLayerId)?.get(code);
	}

	private onMapClick(location: MouseLocation): void {
		if (!get(this.active)) return;
		const code = this.pickZoneCode(location);
		if (code !== undefined) this.toggleZone(code);
	}

	/** Hover handler: brighten the zone under the cursor, reverting the previously hovered one. */
	private onMouseMove(location: MouseLocation): void {
		if (!get(this.active)) return;
		const code = this.pickZoneCode(location);
		if (code === this.hoveredCode) return;
		const previous = this.hoveredCode;
		this.hoveredCode = code;
		if (previous !== undefined) this.applyColor(previous);
		if (code !== undefined) this.applyColor(code);
		this.map.viewer.scene.canvas.style.cursor = code !== undefined ? "pointer" : "";
	}

	/** Resolve the zone code under a screen location from the picked fill-primitive instance id. */
	private pickZoneCode(location: MouseLocation): string | undefined {
		const picked = this.map.viewer.scene.pick(new Cesium.Cartesian2(location.x, location.y));
		const id = Cesium.defined(picked) ? (picked.id as ZoneInstanceId | undefined) : undefined;
		const code = id && typeof id === "object" && typeof id.code === "string" ? id.code : undefined;
		return code !== undefined && this.zoneEntityIndex.has(code) ? code : undefined;
	}

	/** Fly the camera to frame the given zone, using the bounding sphere of all its polygon parts. */
	public zoomToZone(code: string): void {
		const time = this.map.viewer.clock.currentTime;
		const positions: Array<Cesium.Cartesian3> = [];
		for (const entity of this.zoneEntityIndex.get(code) ?? []) {
			const hierarchy = entity.polygon?.hierarchy?.getValue(time) as
				| Cesium.PolygonHierarchy
				| undefined;
			if (hierarchy?.positions) positions.push(...hierarchy.positions);
		}
		if (positions.length === 0) return;
		const sphere = Cesium.BoundingSphere.fromPoints(positions);
		// In 2D mode the camera must stay top-down; range 0 lets Cesium fit the sphere.
		const pitch = get(this.map.options.use3DMode) ? -60 : -89.9;
		this.map.viewer.camera.flyToBoundingSphere(sphere, {
			duration: 1,
			offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(pitch), 0)
		});
	}

	/** Add or remove a zone from the selection, then repaint it. */
	public toggleZone(code: string): void {
		const current = get(this.selectedZones);
		if (current.some((z) => z.code === code)) {
			this.selectedZones.set(current.filter((z) => z.code !== code));
		} else {
			this.selectedZones.set([...current, { code }]);
		}
		this.applyColor(code);
		this.scheduleHighlightRebuild();
	}

	/**
	 * Blend/brighten a zone's base label colour according to its current state
	 * (active > selected > hover > base), preserving the base opacity so the label
	 * hue stays visible in every state.
	 */
	private stateColor(code: string, base: Cesium.Color): Cesium.Color {
		let result: Cesium.Color;
		if (code === this.activeCode) {
			result = Cesium.Color.lerp(
				base,
				ZonalStatisticsController.ACTIVE_TINT,
				ZonalStatisticsController.ACTIVE_TINT_AMOUNT,
				new Cesium.Color()
			);
		} else if (this.isSelected(code)) {
			result = base.brighten(ZonalStatisticsController.SELECTED_BRIGHTEN, new Cesium.Color());
		} else if (code === this.hoveredCode) {
			result = base.brighten(ZonalStatisticsController.HOVER_BRIGHTEN, new Cesium.Color());
		} else {
			return base;
		}
		result.alpha = base.alpha;
		return result;
	}

	/** Repaint every polygon part of one zone to match its current state colour. */
	private paintCode(render: ZoneFillRender, code: string): void {
		const base = render.baseColor.get(code);
		if (!base) return;
		const color = this.stateColor(code, base);
		for (const id of render.idsByCode.get(code) ?? []) {
			const attributes = render.primitive.getGeometryInstanceAttributes(id);
			if (!attributes) continue;
			attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(color, attributes.color);
		}
	}

	/** Repaint one zone code on the shared fill primitive. */
	private applyColor(code: string): void {
		const render = this.zoneFill;
		if (!render) return;
		if (!render.primitive.ready) {
			this.schedulePaint();
			return;
		}
		this.paintCode(render, code);
		this.map.refresh();
	}

	/** Repaint every zone on the shared fill primitive (after its base colours were refreshed). */
	private recolorFill(): void {
		const render = this.zoneFill;
		if (!render) return;
		if (!render.primitive.ready) {
			this.schedulePaint();
			return;
		}
		for (const code of render.idsByCode.keys()) this.paintCode(render, code);
		this.map.refresh();
	}

	/**
	 * Geometry creation is asynchronous, so colour changes made before the primitive is ready would
	 * be dropped by `getGeometryInstanceAttributes`. Repaint once on the first frame it is ready;
	 * until then keep requesting frames, since the scene runs in `requestRenderMode`.
	 */
	private schedulePaint(): void {
		if (this.paintWhenReady) return;
		const scene = this.map.viewer.scene;
		const remove = scene.postRender.addEventListener(() => {
			if (!this.zoneFill) return;
			if (!this.zoneFill.primitive.ready) {
				// A hidden primitive never becomes ready, so only keep the render loop alive while shown.
				if (this.zoneFill.primitive.show) this.map.refresh();
				return;
			}
			this.paintWhenReady?.();
			this.paintWhenReady = undefined;
			this.recolorFill();
		});
		this.paintWhenReady = remove;
		this.map.refresh();
	}

	/** Clear the hover highlight (on mouse-out or tool deactivation). */
	private clearHover(): void {
		if (this.hoveredCode === undefined) return;
		const previous = this.hoveredCode;
		this.hoveredCode = undefined;
		this.applyColor(previous);
		this.map.viewer.scene.canvas.style.cursor = "";
	}

	/**
	 * Mark the zone currently shown in the table so it gets the strongest tint while
	 * the other selected zones keep the milder selection tint.
	 */
	public setActiveZone(code: string | undefined): void {
		if (this.activeCode === code) return;
		const previous = this.activeCode;
		this.activeCode = code;
		if (previous !== undefined) this.applyColor(previous);
		if (code !== undefined) this.applyColor(code);
		this.scheduleHighlightRebuild();
	}

	/** Remove all selected zones and repaint them back to their base colour. */
	public clearSelection(): void {
		const affected = new Set(get(this.selectedZones).map((z) => z.code));
		if (this.activeCode !== undefined) affected.add(this.activeCode);
		this.activeCode = undefined;
		this.selectedZones.set([]);
		for (const code of affected) this.applyColor(code);
		this.scheduleHighlightRebuild();
	}

	/** Whether a zone with the given code is currently selected. */
	public isSelected(code: string): boolean {
		return get(this.selectedZones).some((z) => z.code === code);
	}

	/**
	 * Convert a property value into an optional string for table display.
	 * Blank and placeholder texts ("null"/"nan"/"undefined") count as no value.
	 */
	private toOptionalString(value: any): string | undefined {
		if (value === undefined || value === null) return undefined;
		const text = String(value).trim();
		if (!text || PLACEHOLDER_TEXTS.has(text.toLowerCase())) return undefined;
		return text;
	}

	/** Format one cell value using the column config (including optional numeric rounding). */
	private formatColumnWithDecimals(value: any, column: ZonalColumn): string | undefined {
		const text = this.toOptionalString(value);
		if (text === undefined || column.decimals === undefined) return text;

		const numericValue = Number(text);
		return Number.isFinite(numericValue) ? numericValue.toFixed(column.decimals) : text;
	}

	/**
	 * Read an optional tooltip attribute from a props object as a string value.
	 * Blank and placeholder texts ("null"/"nan"/"undefined") count as no tooltip.
	 */
	private readOptionalAttribute(
		props: Record<string, any> | undefined,
		attribute: string | undefined
	): string | undefined {
		if (!attribute) return undefined;
		return this.toOptionalString(props?.[attribute]);
	}

	/** Build one table row for a resolved data layer across selected zones. */
	private buildTableRow(dl: ResolvedDataLayer, zones: Array<string>): ZoneTableRow {
		const index = this.valueIndex.get(dl.layerId);
		const columns = this.settings.columns;
		const values: Record<string, Array<string | undefined>> = {};
		const tooltips: Record<string, Array<string | undefined>> = {};

		for (const code of zones) {
			const props = index?.get(code);
			values[code] = columns.map((c) =>
				this.formatColumnWithDecimals(props?.[this.attributeFor(dl.layerId, c)], c)
			);
			tooltips[code] = columns.map((c) =>
				this.readOptionalAttribute(props, this.tooltipAttributeFor(dl.layerId, c))
			);
		}

		return {
			layerId: dl.layerId,
			title: dl.title,
			values,
			tooltips
		};
	}

	/**
	 * Build the per-column value + tooltip slice for a single zone across the
	 * data layers currently in the table. Used by the view to update the table
	 * incrementally when one zone is (de)selected.
	 */
	public buildZoneSlice(code: string): Array<{
		layerId: string;
		values: Array<string | undefined>;
		tooltips: Array<string | undefined>;
	}> {
		const columns = this.settings.columns;
		return get(this.tableLayers).map((dl) => {
			const props = this.valueIndex.get(dl.layerId)?.get(code);
			return {
				layerId: dl.layerId,
				values: columns.map((c) =>
					this.formatColumnWithDecimals(props?.[this.attributeFor(dl.layerId, c)], c)
				),
				tooltips: columns.map((c) =>
					this.readOptionalAttribute(props, this.tooltipAttributeFor(dl.layerId, c))
				)
			};
		});
	}

	/**
	 * Build the zone table for the current selection: one row per data layer
	 * added to the table and one configured column per selected zone.
	 */
	public buildTable(): ZoneTable {
		const zones = get(this.selectedZones).map((z) => z.code);
		const rows: Array<ZoneTableRow> = get(this.tableLayers).map((dl) =>
			this.buildTableRow(dl, zones)
		);
		return { zones, rows };
	}

	/**
	 * Flatten the current zone table to export rows.
	 * Export always reflects the currently visible table state.
	 * Row order is zone-first so all entries for the same zone stay grouped.
	 */
	public buildExportRows(): Array<ZonalStatisticsExportRow> {
		const table = this.buildTable();
		const columnCount = this.settings.columns.length;
		const exportRows: Array<ZonalStatisticsExportRow> = [];

		for (const zone of table.zones) {
			for (const row of table.rows) {
				const values = row.values[zone] ?? [];
				const tooltips = row.tooltips[zone] ?? [];
				exportRows.push({
					zoneCode: zone,
					layerTitle: row.title,
					values: Array.from({ length: columnCount }, (_, i) => values[i] ?? ""),
					tooltips: Array.from({ length: columnCount }, (_, i) => tooltips[i] ?? "")
				});
			}
		}

		return exportRows;
	}

	/** Resolved data layers the table currently shows a row for. */
	public getTableLayers(): Array<ResolvedDataLayer> {
		return get(this.tableLayers);
	}

	/** Detach listeners, remove the fill primitive, and restore the GeoJson entity fills. */
	public destroy(): void {
		if (this.clickHandler) {
			this.map.off("mouseLeftClick", this.clickHandler as (n: unknown) => unknown);
			this.clickHandler = undefined;
		}
		if (this.moveHandler) {
			this.map.off("mouseMove", this.moveHandler as (n: unknown) => unknown);
			this.moveHandler = undefined;
		}
		for (const unsubscribe of this.unsubscribers) unsubscribe();
		this.unsubscribers.length = 0;
		this.paintWhenReady?.();
		this.paintWhenReady = undefined;
		if (this.zoneOutlinePrimitive) {
			this.map.viewer.scene.primitives.remove(this.zoneOutlinePrimitive);
			this.zoneOutlinePrimitive = undefined;
		}
		this.zoneOutlineIds.length = 0;
		if (this.zoneHighlightPrimitive) {
			this.map.viewer.scene.primitives.remove(this.zoneHighlightPrimitive);
			this.zoneHighlightPrimitive = undefined;
		}
		if (this.zoneFill) {
			this.map.viewer.scene.primitives.remove(this.zoneFill.primitive);
			this.zoneFill = undefined;
		}
		if (this.zoneLayer) this.restoreEntityFills(this.zoneLayer);
		this.trackedLayers.length = 0;
		this.colorLayerId = undefined;
		this.colorIndex.clear();
		this.valueIndex.clear();
		this.tableLayers.set([]);
		this.map.viewer.scene.canvas.style.cursor = "";
		this.map.refresh();
	}
}
