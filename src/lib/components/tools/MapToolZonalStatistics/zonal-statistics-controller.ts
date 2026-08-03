import { get, writable, type Writable } from "svelte/store";
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
	private readonly map: CesiumMap;
	public readonly settings: ZonalStatisticsSettings;

	/** Whether the tool is active and should react to map clicks. */
	public readonly active: Writable<boolean> = writable(false);
	/** Currently selected zones, in selection order. */
	public readonly selectedZones: Writable<Array<SelectedZone>> = writable([]);

	private zoneLayer: GeoJsonLayer | undefined;
	/** Zone code -> zone-layer entity, used to resolve highlight geometry from clicks. */
	private readonly zoneEntityIndex: Map<string, Cesium.Entity> = new Map();
	/** Resolved data layers per config id, in config order. */
	private readonly dataLayers: Array<ResolvedDataLayer> = [];
	/** Resolved data layers exposed to the zonal panel UI. */
	public readonly resolvedDataLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** Per data-layer index: zone code -> feature properties. */
	private readonly valueIndex: Map<string, Map<string, Record<string, any>>> = new Map();

	/** Dedicated data source that draws outlines around selected zones. */
	private highlightSource: Cesium.CustomDataSource | undefined;
	/** The zone currently shown in the table (drawn light blue). */
	private activeCode: string | undefined;
	private clickHandler: ((l: MouseLocation) => void) | undefined;

	constructor(map: CesiumMap, settings: ZonalStatisticsSettings) {
		this.map = map;
		this.settings = settings;
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

		this.highlightSource = new Cesium.CustomDataSource(
			`${this.settings.zoneLayerId}_zonal_highlight`
		);
		this.map.viewer.dataSources.add(this.highlightSource);

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

	/** Build a zone-code -> zone-layer entity lookup for resolving click geometry. */
	private indexZoneEntities(): void {
		this.zoneEntityIndex.clear();
		const entities = this.zoneLayer?.source?.entities?.values ?? [];
		for (const entity of entities) {
			const props = entity.properties?.getValue(this.map.viewer.clock.currentTime);
			const code = props?.[this.settings.zoneCodeAttribute];
			if (code !== undefined && code !== null) {
				this.zoneEntityIndex.set(String(code), entity);
			}
		}
	}

	/** Build a zone-code -> properties lookup for one data layer. */
	private indexLayer(layerId: string, layer: GeoJsonLayer): void {
		const index = new Map<string, Record<string, any>>();
		const entities = layer.source?.entities?.values ?? [];
		for (const entity of entities) {
			const props = entity.properties?.getValue(this.map.viewer.clock.currentTime);
			if (!props) continue;
			const code = props[this.settings.zoneCodeAttribute];
			if (code !== undefined && code !== null) {
				index.set(String(code), props);
			}
		}
		this.valueIndex.set(layerId, index);
	}

	private onMapClick(location: MouseLocation): void {
		if (!get(this.active)) return;

		const picked = this.map.viewer.scene.pick(new Cesium.Cartesian2(location.x, location.y));
		if (!Cesium.defined(picked) || !(picked.id instanceof Cesium.Entity)) return;

		const entity = picked.id as Cesium.Entity;
		const props = entity.properties?.getValue(this.map.viewer.clock.currentTime);
		const rawCode = props?.[this.settings.zoneCodeAttribute];
		if (rawCode === undefined || rawCode === null) return;

		// Resolve the zone from the zone layer so highlight geometry never depends on
		// which (possibly overlapping) layer was picked. Ignore stray picks on other
		// entities that merely carry the same attribute.
		const code = String(rawCode);
		const zoneEntity = this.zoneEntityIndex.get(code);
		if (!zoneEntity) return;

		this.toggleZone(code, zoneEntity);
	}

	/** Add or remove a zone from the selection. */
	public toggleZone(code: string, entity?: Cesium.Entity): void {
		const current = get(this.selectedZones);
		if (current.some((z) => z.code === code)) {
			this.removeHighlight(code);
			this.selectedZones.set(current.filter((z) => z.code !== code));
		} else {
			const zoneEntity = entity ?? this.zoneEntityIndex.get(code);
			if (zoneEntity) this.addHighlight(code, zoneEntity);
			this.selectedZones.set([...current, { code }]);
		}
	}

	private addHighlight(code: string, entity: Cesium.Entity): void {
		if (!this.highlightSource) return;
		const hierarchy = entity.polygon?.hierarchy?.getValue(this.map.viewer.clock.currentTime);
		if (!hierarchy?.positions) return;
		this.highlightSource.entities.add({
			id: `zonal_${code}`,
			polyline: {
				positions: hierarchy.positions,
				clampToGround: true,
				width: new Cesium.ConstantProperty(4),
				material: new Cesium.ColorMaterialProperty(this.highlightColor(code))
			}
		});
		this.map.refresh();
	}

	private removeHighlight(code: string): void {
		if (!this.highlightSource) return;
		this.highlightSource.entities.removeById(`zonal_${code}`);
		this.map.refresh();
	}

	/** Colour used for a zone outline: light blue when it is the active zone. */
	private highlightColor(code: string): Cesium.Color {
		return code === this.activeCode ? Cesium.Color.LIGHTBLUE : Cesium.Color.YELLOW;
	}

	/**
	 * Mark the zone currently shown in the table so it gets a light blue
	 * outline while the other selected zones stay yellow.
	 */
	public setActiveZone(code: string | undefined): void {
		if (this.activeCode === code) return;
		this.activeCode = code;
		if (!this.highlightSource) return;
		for (const entity of this.highlightSource.entities.values) {
			if (!entity.polyline || typeof entity.id !== "string") continue;
			const entityCode = entity.id.replace(/^zonal_/, "");
			entity.polyline.material = new Cesium.ColorMaterialProperty(this.highlightColor(entityCode));
		}
		this.map.refresh();
	}

	/** Remove all selected zones and their highlights. */
	public clearSelection(): void {
		this.highlightSource?.entities.removeAll();
		this.activeCode = undefined;
		this.selectedZones.set([]);
		this.map.refresh();
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
		if (this.highlightSource) {
			this.map.viewer.dataSources.remove(this.highlightSource, true);
			this.highlightSource = undefined;
		}
		this.map.refresh();
	}
}
