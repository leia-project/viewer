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
	/** One row per configured data layer. */
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

/**
 * Owns all non-UI logic for the Zonal Statistics tool: resolving the
 * configured zone + data layers, ensuring their data is loaded, handling map
 * clicks to (de)select zones, highlighting the selection, and building the
 * zone table. UI components subscribe to the exposed stores.
 */
export class ZonalStatisticsController {
	// Selection-highlight outline colours (per-instance on a batched ground polyline primitive).
	private static readonly HIGHLIGHT_ACTIVE_COLOR = Cesium.Color.DEEPSKYBLUE;
	private static readonly HIGHLIGHT_INACTIVE_COLOR = Cesium.Color.YELLOW;

	private readonly map: CesiumMap;
	public readonly settings: ZonalStatisticsSettings;

	/** Whether the tool is active and should react to map clicks. */
	public readonly active: Writable<boolean> = writable(false);
	/** Currently selected zones, in selection order. */
	public readonly selectedZones: Writable<Array<SelectedZone>> = writable([]);

	private zoneLayer: GeoJsonLayer | undefined;
	/** Zone code -> zone-layer entities, used to resolve highlight geometry from clicks. A single
	 * MultiPolygon zone becomes multiple entities (one per part) that share the same code. */
	private readonly zoneEntityIndex: Map<string, Array<Cesium.Entity>> = new Map();
	/** Pickable entity -> its zone code, so clicks resolve the code without a getValue call. */
	private readonly entityCodeIndex: Map<Cesium.Entity, string> = new Map();
	/** Resolved data layers per config id, in config order. */
	private readonly dataLayers: Array<ResolvedDataLayer> = [];
	/** Resolved data layers exposed to the zonal panel UI. */
	public readonly resolvedDataLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** Per data-layer index: zone code -> feature properties (only the attributes the table reads). */
	private readonly valueIndex: Map<string, Map<string, Record<string, any>>> = new Map();
	/** Distinct data-layer attributes the table + tooltips read (column + tooltip attributes). */
	private readonly neededAttributes: Array<string>;
	/** Cleaned outline rings per zone code (one ring per polygon part), shared by the black outline
	 * + selection highlights. MultiPolygon zones contribute several rings under the same code. */
	private readonly ringCache: Map<string, Array<Array<Cesium.Cartesian3>>> = new Map();

	/** Single batched ground polyline primitive outlining the selected zones (drawn above the black outline). */
	private highlightPrimitive: Cesium.GroundPolylinePrimitive | undefined;
	/** Single batched ground polyline primitive drawing a thin black outline around every zone feature. */
	private zoneOutlinePrimitive: Cesium.GroundPolylinePrimitive | undefined;
	/** Unsubscriber keeping the zone-outline visibility in sync with the zone layer. */
	private zoneVisibleUnsub: Unsubscriber | undefined;
	/** The zone currently shown in the table (drawn light blue). */
	private activeCode: string | undefined;
	private clickHandler: ((l: MouseLocation) => void) | undefined;

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
		}
		this.resolvedDataLayers.set([...this.dataLayers]);

		// Add the black outline first so the (later-added) selection highlights draw on top.
		this.addZoneOutlines();

		this.clickHandler = (l: MouseLocation) => this.onMapClick(l);
		this.map.on("mouseLeftClick", this.clickHandler as (n: unknown) => unknown);
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
	 * Drop consecutive duplicate vertices and the closing duplicate of a polygon
	 * ring. `GroundPolylineGeometry` with `loop:true` throws "normalized result is
	 * not a number" on zero-length segments, which closed GeoJSON rings produce.
	 */
	private cleanRing(positions: Array<Cesium.Cartesian3> | undefined): Array<Cesium.Cartesian3> {
		if (!positions?.length) return [];
		const cleaned: Array<Cesium.Cartesian3> = [];
		for (const position of positions) {
			const previous = cleaned[cleaned.length - 1];
			if (!previous || !Cesium.Cartesian3.equalsEpsilon(previous, position, Cesium.Math.EPSILON7)) {
				cleaned.push(position);
			}
		}
		if (
			cleaned.length > 1 &&
			Cesium.Cartesian3.equalsEpsilon(cleaned[0], cleaned[cleaned.length - 1], Cesium.Math.EPSILON7)
		) {
			cleaned.pop();
		}
		return cleaned;
	}

	/** Draw a thin black outline around every zone feature, shown while the zone layer is visible. */
	private addZoneOutlines(): void {
		if (!this.zoneLayer) return;
		const time = this.map.viewer.clock.currentTime;
		const outlineColor = Cesium.ColorGeometryInstanceAttribute.fromColor(
			Cesium.Color.BLACK.withAlpha(0.1)
		);
		const instances: Array<Cesium.GeometryInstance> = [];
		for (const entity of this.zoneLayer.source?.entities?.values ?? []) {
			const positions = this.cleanRing(entity.polygon?.hierarchy?.getValue(time)?.positions);
			if (positions.length < 2) continue;
			// Cache the cleaned ring so highlight rebuilds reuse it instead of re-cleaning. A
			// MultiPolygon zone spans several entities sharing one code, so append per part.
			const code = this.entityCodeIndex.get(entity);
			if (code !== undefined) {
				const rings = this.ringCache.get(code) ?? [];
				rings.push(positions);
				this.ringCache.set(code, rings);
			}
			instances.push(
				new Cesium.GeometryInstance({
					geometry: new Cesium.GroundPolylineGeometry({ positions, width: 1.5, loop: true }),
					attributes: { color: outlineColor }
				})
			);
		}
		if (instances.length === 0) return;
		// One batched primitive instead of thousands of ground-clamped polyline entities.
		this.zoneOutlinePrimitive = new Cesium.GroundPolylinePrimitive({
			geometryInstances: instances,
			appearance: new Cesium.PolylineColorAppearance(),
			asynchronous: true,
			allowPicking: false
		});
		this.map.viewer.scene.groundPrimitives.add(this.zoneOutlinePrimitive);
		this.zoneVisibleUnsub = this.zoneLayer.visible.subscribe((visible) => {
			if (this.zoneOutlinePrimitive) this.zoneOutlinePrimitive.show = visible;
			this.map.refresh();
		});
	}

	/** Read a single entity property by name without materialising the whole property bag. */
	private readProperty(
		entity: Cesium.Entity,
		attribute: string,
		time: Cesium.JulianDate
	): any {
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

		const picked = this.map.viewer.scene.pick(new Cesium.Cartesian2(location.x, location.y));
		if (!Cesium.defined(picked) || !(picked.id instanceof Cesium.Entity)) return;

		// Resolve the code from the cached entity index (no per-click getValue). Then
		// resolve the zone from the zone layer so highlight geometry never depends on
		// which (possibly overlapping) layer was picked. Ignore stray picks on other
		// entities that carry no known code.
		const entity = picked.id as Cesium.Entity;
		const code = this.entityCodeIndex.get(entity);
		if (code === undefined) return;

		if (!this.zoneEntityIndex.has(code)) return;

		this.toggleZone(code);
	}

	/** Add or remove a zone from the selection, then redraw the highlight outlines. */
	public toggleZone(code: string): void {
		const current = get(this.selectedZones);
		if (current.some((z) => z.code === code)) {
			this.selectedZones.set(current.filter((z) => z.code !== code));
		} else {
			this.selectedZones.set([...current, { code }]);
		}
		this.rebuildHighlights();
	}

	/** Cleaned outline rings for a zone code (one per polygon part), computed on demand and cached
	 * (shared with the black outline). MultiPolygon zones return several rings. */
	private ringPositionsFor(code: string, time: Cesium.JulianDate): Array<Array<Cesium.Cartesian3>> {
		let rings = this.ringCache.get(code);
		if (!rings) {
			rings = [];
			for (const entity of this.zoneEntityIndex.get(code) ?? []) {
				const positions = this.cleanRing(entity.polygon?.hierarchy?.getValue(time)?.positions);
				if (positions.length >= 2) rings.push(positions);
			}
			this.ringCache.set(code, rings);
		}
		return rings;
	}

	/**
	 * Redraw the selection outlines as one batched `GroundPolylinePrimitive` added
	 * after the black zone outline, so the blue/yellow selection always draws on
	 * top of the black outline. The active zone is wider + bright blue; the other
	 * selected zones stay yellow. Rebuilt on each selection/active change
	 * (selections are few, so this is cheap).
	 */
	private rebuildHighlights(): void {
		if (this.highlightPrimitive) {
			this.map.viewer.scene.groundPrimitives.remove(this.highlightPrimitive);
			this.highlightPrimitive = undefined;
		}
		const time = this.map.viewer.clock.currentTime;
		const instances: Array<Cesium.GeometryInstance> = [];
		for (const { code } of get(this.selectedZones)) {
			const rings = this.ringPositionsFor(code, time);
			if (rings.length === 0) continue;
			const active = code === this.activeCode;
			for (const positions of rings) {
				if (positions.length < 2) continue;
				instances.push(
					new Cesium.GeometryInstance({
						geometry: new Cesium.GroundPolylineGeometry({
							positions,
							width: active ? 7 : 4,
							loop: true
						}),
						attributes: {
							color: Cesium.ColorGeometryInstanceAttribute.fromColor(
								active
									? ZonalStatisticsController.HIGHLIGHT_ACTIVE_COLOR
									: ZonalStatisticsController.HIGHLIGHT_INACTIVE_COLOR
							)
						}
					})
				);
			}
		}
		if (instances.length > 0) {
			// Synchronous so the outline appears immediately on click (few instances).
			this.highlightPrimitive = new Cesium.GroundPolylinePrimitive({
				geometryInstances: instances,
				appearance: new Cesium.PolylineColorAppearance(),
				asynchronous: false,
				allowPicking: false
			});
			this.map.viewer.scene.groundPrimitives.add(this.highlightPrimitive);
		}
		this.map.refresh();
	}

	/**
	 * Mark the zone currently shown in the table so it gets a bright blue, thicker
	 * outline while the other selected zones stay yellow.
	 */
	public setActiveZone(code: string | undefined): void {
		if (this.activeCode === code) return;
		this.activeCode = code;
		this.rebuildHighlights();
	}

	/** Remove all selected zones and their highlights. */
	public clearSelection(): void {
		this.activeCode = undefined;
		this.selectedZones.set([]);
		this.rebuildHighlights();
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
	 * Build the per-column value + tooltip slice for a single zone across all
	 * data layers (aligned to the resolved data-layer order). Used by the view
	 * to update the table incrementally when one zone is (de)selected.
	 */
	public buildZoneSlice(
		code: string
	): Array<{ values: Array<string | undefined>; tooltips: Array<string | undefined> }> {
		const columns = this.settings.columns;
		return this.dataLayers.map((dl) => {
			const props = this.valueIndex.get(dl.layerId)?.get(code);
			return {
				values: columns.map((c) => this.toOptionalString(props?.[c.attribute])),
				tooltips: columns.map((c) => this.readOptionalAttribute(props, c.tooltipAttribute))
			};
		});
	}

	/**
	 * Build the zone table for the current selection: one row per configured
	 * data layer and one configured column per selected zone.
	 */
	public buildTable(): ZoneTable {
		const zones = get(this.selectedZones).map((z) => z.code);
		const rows: Array<ZoneTableRow> = this.dataLayers.map((dl) => this.buildTableRow(dl, zones));
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

	/** Resolved data layers used by the zonal statistics left panel. */
	public getResolvedDataLayers(): Array<ResolvedDataLayer> {
		return get(this.resolvedDataLayers);
	}

	/** Detach listeners and remove highlight graphics. */
	public destroy(): void {
		if (this.clickHandler) {
			this.map.off("mouseLeftClick", this.clickHandler as (n: unknown) => unknown);
			this.clickHandler = undefined;
		}
		if (this.zoneVisibleUnsub) {
			this.zoneVisibleUnsub();
			this.zoneVisibleUnsub = undefined;
		}
		if (this.zoneOutlinePrimitive) {
			this.map.viewer.scene.groundPrimitives.remove(this.zoneOutlinePrimitive);
			this.zoneOutlinePrimitive = undefined;
		}
		if (this.highlightPrimitive) {
			this.map.viewer.scene.groundPrimitives.remove(this.highlightPrimitive);
			this.highlightPrimitive = undefined;
		}
		this.map.refresh();
	}
}
