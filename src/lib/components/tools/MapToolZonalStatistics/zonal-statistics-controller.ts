import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";

import type { Map as CesiumMap } from "$lib/map-cesium/map";
import type { MouseLocation } from "$lib/map-core/mouse-location";
import type { GeoJsonLayer } from "$lib/map-cesium/layers/geojson-layer";
import type { ZonalStatisticsSettings } from "./zonal-config";

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

/** Rendering + bookkeeping for one layer's batched fill primitive. */
interface FillLayerRender {
	layer: GeoJsonLayer;
	primitive: Cesium.Primitive;
	/** zone code -> the instance ids of its polygon parts. */
	idsByCode: Map<string, Array<ZoneInstanceId>>;
	/** instance id -> its source entity (to re-read colour on restyle). */
	entityById: Map<ZoneInstanceId, Cesium.Entity>;
	/** instance id -> current base label colour. */
	baseColor: Map<ZoneInstanceId, Cesium.Color>;
}

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
	// Base zone-boundary outline colour (does not change with selection/active state); its alpha
	// tracks the zone layer's opacity slider.
	private static readonly OUTLINE_COLOR = Cesium.Color.BLACK;

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
	/** Pickable entity -> its zone code, resolved once so picking/indexing skip getValue calls. */
	private readonly entityCodeIndex: Map<Cesium.Entity, string> = new Map();
	/** Resolved data layers per config id, in config order. */
	private readonly dataLayers: Array<ResolvedDataLayer> = [];
	/** Resolved data layers exposed to the zonal panel UI. */
	public readonly resolvedDataLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** Resolved data layers that are currently visible; drives the table, exports and statistics. */
	public readonly visibleDataLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** True while `initialize()` is resolving/loading the configured layers. */
	public readonly loading: Writable<boolean> = writable(false);
	/** Per data-layer index: zone code -> feature properties (only the attributes the table reads). */
	private readonly valueIndex: Map<string, Map<string, Record<string, any>>> = new Map();
	/** Distinct data-layer attributes the table + tooltips read (column + tooltip attributes). */
	private readonly neededAttributes: Array<string>;

	/** One batched fill primitive per unique layer id (zone + data layers), keyed by layer id. */
	private readonly fillRenders: Map<string, FillLayerRender> = new Map();
	/** Single batched primitive outlining every zone boundary (added on top of the fills). */
	private zoneOutlinePrimitive: Cesium.Primitive | undefined;
	/** Per-instance ids of the outline primitive, used to rescale their alpha with layer opacity. */
	private readonly zoneOutlineIds: Array<object> = [];
	/** Store/event unsubscribers for the fill primitives (visible/opacity/style/active). */
	private readonly unsubscribers: Array<Unsubscriber> = [];
	/** The zone currently shown in the table (drawn with the strongest tint). */
	private activeCode: string | undefined;
	/** The zone currently under the mouse (brightened), or undefined. */
	private hoveredCode: string | undefined;
	private clickHandler: ((l: MouseLocation) => void) | undefined;
	private moveHandler: ((l: MouseLocation) => void) | undefined;

	constructor(map: CesiumMap, settings: ZonalStatisticsSettings) {
		this.map = map;
		this.settings = settings;
		const attrs = new Set<string>();
		for (const column of settings.columns) {
			attrs.add(column.attribute);
			if (column.tooltipAttribute) attrs.add(column.tooltipAttribute);
		}
		this.neededAttributes = [...attrs];
	}

	/**
	 * Resolve the configured layers, make sure their data is loaded (even while
	 * hidden), index feature values by zone code, and start listening for clicks.
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
			this.indexZoneEntities();

			for (const cfg of this.settings.layers) {
				const layer = this.map.getLayerById(cfg.id) as GeoJsonLayer | undefined;
				if (!layer) {
					console.warn(`zonalStatistics: data layer '${cfg.id}' not found in map layers`);
					continue;
				}
				await this.ensureLoaded(layer);
				this.dataLayers.push({
					layerId: cfg.id,
					title: cfg.title ?? layer.config.title,
					layer
				});
				this.indexLayer(cfg.id, layer);
				// Publish per layer so the panel can replace its skeletons one by one.
				this.resolvedDataLayers.set([...this.dataLayers]);
			}
			this.syncVisibleDataLayers();
			for (const dl of this.dataLayers) {
				this.unsubscribers.push(dl.layer.visible.subscribe(() => this.syncVisibleDataLayers()));
			}

			this.buildFillRenders();
			// Added after the fills so the boundary lines draw on top of them.
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

	/** Publish the subset of resolved data layers that is currently visible. */
	private syncVisibleDataLayers(): void {
		this.visibleDataLayers.set(this.dataLayers.filter((dl) => get(dl.layer.visible)));
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
	 * Build one batched fill primitive per unique layer (zone + data layers): every polygon part
	 * becomes a flat `PolygonGeometry` instance coloured with the layer's own label colour,
	 * replacing the slow per-feature GeoJson entities. The entity fills are then hidden; the tool
	 * renders + picks the primitives instead. No terrain is assumed, so the polygons sit flat at
	 * height 0.
	 */
	private buildFillRenders(): void {
		const uniqueLayers = new Map<string, GeoJsonLayer>();
		if (this.zoneLayer) uniqueLayers.set(this.settings.zoneLayerId, this.zoneLayer);
		for (const dl of this.dataLayers) uniqueLayers.set(dl.layerId, dl.layer);

		for (const [layerId, layer] of uniqueLayers) {
			const render = this.buildFillRender(layer);
			if (!render) continue;
			this.fillRenders.set(layerId, render);
			this.hideEntityFills(layer);
			this.unsubscribers.push(
				layer.visible.subscribe((visible) => {
					render.primitive.show = visible;
					this.map.refresh();
				}),
				// The GeoJson layer updates its entity materials first on an opacity/style change, so
				// re-reading here picks up the fresh colours before repainting the primitive.
				layer.opacity.subscribe(() => this.refreshBaseColors(render)),
				layer.style.subscribe(() => this.refreshBaseColors(render)),
				layer.legend.subscribe(() => this.refreshBaseColors(render))
			);
		}
	}

	/** Build the batched fill primitive + id bookkeeping for one layer. */
	private buildFillRender(layer: GeoJsonLayer): FillLayerRender | undefined {
		const source = layer.source;
		if (!source) return undefined;
		const time = this.map.viewer.clock.currentTime;
		const idsByCode = new Map<string, Array<ZoneInstanceId>>();
		const entityById = new Map<ZoneInstanceId, Cesium.Entity>();
		const baseColor = new Map<ZoneInstanceId, Cesium.Color>();
		const instances: Array<Cesium.GeometryInstance> = [];

		for (const entity of source.entities.values) {
			const code = this.entityCodeIndex.get(entity);
			if (code === undefined) continue;
			const hierarchy = entity.polygon?.hierarchy?.getValue(time) as
				| Cesium.PolygonHierarchy
				| undefined;
			if (!hierarchy || hierarchy.positions.length < 3) continue;
			const color = this.readEntityColor(entity, time);
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
			entityById.set(id, entity);
			baseColor.set(id, color);
		}
		if (instances.length === 0) return undefined;

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
		primitive.show = get(layer.visible);
		this.map.viewer.scene.primitives.add(primitive);
		return { layer, primitive, idsByCode, entityById, baseColor };
	}

	/**
	 * Outline every zone boundary as a single batched `Primitive` of `PolygonOutlineGeometry`
	 * instances (one draw call, not thousands of entities), flat at height 0 with the depth test
	 * off so the lines sit on top of the fills. Only the zone layer is outlined (data layers share
	 * the same geometry); visibility follows the zone layer and the line alpha tracks its opacity.
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
		this.zoneOutlinePrimitive.show = get(this.zoneLayer.visible);
		this.map.viewer.scene.primitives.add(this.zoneOutlinePrimitive);
		this.unsubscribers.push(
			this.zoneLayer.visible.subscribe((visible) => {
				if (this.zoneOutlinePrimitive) this.zoneOutlinePrimitive.show = visible;
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
		if (!primitive || !primitive.ready) return;
		const value = Cesium.ColorGeometryInstanceAttribute.toValue(this.outlineColor());
		for (const id of this.zoneOutlineIds) {
			const attributes = primitive.getGeometryInstanceAttributes(id);
			if (attributes) attributes.color = value;
		}
		this.map.refresh();
	}

	/** Read a polygon entity's current fill colour (label colour + opacity) from its material. */
	private readEntityColor(entity: Cesium.Entity, time: Cesium.JulianDate): Cesium.Color {
		const material = entity.polygon?.material as Cesium.ColorMaterialProperty | undefined;
		const color = material?.color?.getValue?.(time);
		return color instanceof Cesium.Color ? color.clone() : Cesium.Color.GRAY.withAlpha(0.5);
	}

	/** Hide a layer's GeoJson entity polygon fills so only the batched primitive renders. */
	private hideEntityFills(layer: GeoJsonLayer): void {
		for (const entity of layer.source?.entities?.values ?? []) {
			if (entity.polygon) entity.polygon.show = new Cesium.ConstantProperty(false);
		}
	}

	/** Restore a layer's GeoJson entity polygon fills (undo `hideEntityFills`). */
	private restoreEntityFills(layer: GeoJsonLayer): void {
		for (const entity of layer.source?.entities?.values ?? []) {
			if (entity.polygon) entity.polygon.show = new Cesium.ConstantProperty(true);
		}
	}

	/** Re-read a layer's entity colours (after an opacity/style change) and repaint every part. */
	private refreshBaseColors(render: FillLayerRender): void {
		const time = this.map.viewer.clock.currentTime;
		for (const [id, entity] of render.entityById) {
			render.baseColor.set(id, this.readEntityColor(entity, time));
		}
		this.recolorRender(render);
	}

	/** Read a single entity property by name without materialising the whole property bag. */
	private readProperty(entity: Cesium.Entity, attribute: string, time: Cesium.JulianDate): any {
		const bag = entity.properties as unknown as
			| Record<string, { getValue(t: Cesium.JulianDate): any } | undefined>
			| undefined;
		return bag?.[attribute]?.getValue(time);
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
				const key = String(code);
				// A MultiPolygon zone becomes several entities under one code; keep them all.
				const list = this.zoneEntityIndex.get(key) ?? [];
				list.push(entity);
				this.zoneEntityIndex.set(key, list);
				this.entityCodeIndex.set(entity, key);
			}
		}
	}

	/** Build a zone-code -> properties lookup for one data layer. */
	private indexLayer(layerId: string, layer: GeoJsonLayer): void {
		const index = new Map<string, Record<string, any>>();
		const time = this.map.viewer.clock.currentTime;
		const codeAttr = this.settings.zoneCodeAttribute;
		const entities = layer.source?.entities?.values ?? [];
		for (const entity of entities) {
			const code = this.readProperty(entity, codeAttr, time);
			if (code === undefined || code === null) continue;
			const key = String(code);
			// Store only the attributes the table + tooltips read, not the whole property bag.
			const props: Record<string, any> = {};
			for (const attr of this.neededAttributes) props[attr] = this.readProperty(entity, attr, time);
			index.set(key, props);
			this.entityCodeIndex.set(entity, key);
		}
		this.valueIndex.set(layerId, index);
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

	/** Repaint one instance to match its zone's current state colour. */
	private paintInstance(render: FillLayerRender, id: ZoneInstanceId): void {
		const base = render.baseColor.get(id);
		if (!base) return;
		const attributes = render.primitive.getGeometryInstanceAttributes(id);
		if (!attributes) return;
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(
			this.stateColor(id.code, base),
			attributes.color
		);
	}

	/** Repaint every part of one zone code across all fill primitives. */
	private applyColor(code: string): void {
		for (const render of this.fillRenders.values()) {
			if (!render.primitive.ready) continue;
			for (const id of render.idsByCode.get(code) ?? []) this.paintInstance(render, id);
		}
		this.map.refresh();
	}

	/** Repaint every part of one fill primitive (after its colours were refreshed). */
	private recolorRender(render: FillLayerRender): void {
		if (!render.primitive.ready) return;
		for (const ids of render.idsByCode.values()) {
			for (const id of ids) this.paintInstance(render, id);
		}
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
	}

	/** Remove all selected zones and repaint them back to their base colour. */
	public clearSelection(): void {
		const affected = new Set(get(this.selectedZones).map((z) => z.code));
		if (this.activeCode !== undefined) affected.add(this.activeCode);
		this.activeCode = undefined;
		this.selectedZones.set([]);
		for (const code of affected) this.applyColor(code);
	}

	/** Whether a zone with the given code is currently selected. */
	public isSelected(code: string): boolean {
		return get(this.selectedZones).some((z) => z.code === code);
	}

	/** Convert a property value into an optional string for table display. */
	private toOptionalString(value: any): string | undefined {
		return value !== undefined && value !== null ? String(value) : undefined;
	}

	/** Read an optional attribute from a props object as a string value. */
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
			values[code] = columns.map((c) => this.toOptionalString(props?.[c.attribute]));
			tooltips[code] = columns.map((c) => this.readOptionalAttribute(props, c.tooltipAttribute));
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
	 * currently visible data layers. Used by the view to update the table
	 * incrementally when one zone is (de)selected.
	 */
	public buildZoneSlice(
		code: string
	): Array<{
		layerId: string;
		values: Array<string | undefined>;
		tooltips: Array<string | undefined>;
	}> {
		const columns = this.settings.columns;
		return get(this.visibleDataLayers).map((dl) => {
			const props = this.valueIndex.get(dl.layerId)?.get(code);
			return {
				layerId: dl.layerId,
				values: columns.map((c) => this.toOptionalString(props?.[c.attribute])),
				tooltips: columns.map((c) => this.readOptionalAttribute(props, c.tooltipAttribute))
			};
		});
	}

	/**
	 * Build the zone table for the current selection: one row per visible data
	 * layer and one configured column per selected zone.
	 */
	public buildTable(): ZoneTable {
		const zones = get(this.selectedZones).map((z) => z.code);
		const rows: Array<ZoneTableRow> = get(this.visibleDataLayers).map((dl) =>
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

	/** Resolved data layers that are currently visible (the ones the table shows). */
	public getVisibleDataLayers(): Array<ResolvedDataLayer> {
		return get(this.visibleDataLayers);
	}

	/** Detach listeners, remove the fill primitives, and restore the GeoJson entity fills. */
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
		if (this.zoneOutlinePrimitive) {
			this.map.viewer.scene.primitives.remove(this.zoneOutlinePrimitive);
			this.zoneOutlinePrimitive = undefined;
		}
		this.zoneOutlineIds.length = 0;
		for (const render of this.fillRenders.values()) {
			this.map.viewer.scene.primitives.remove(render.primitive);
			this.restoreEntityFills(render.layer);
		}
		this.fillRenders.clear();
		this.map.viewer.scene.canvas.style.cursor = "";
		this.map.refresh();
	}
}
