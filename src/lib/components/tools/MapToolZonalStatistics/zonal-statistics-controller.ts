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

/** One row of the passport table (one configured data layer / theme). */
export interface PassportRow {
	/** Config id of the data layer. */
	layerId: string;
	/** Human readable title shown as the row label. */
	title: string;
	/** Current label per selected zone code. */
	values: Record<string, string | undefined>;
	/** Tooltip text for current label cells per selected zone code. */
	valueTooltips: Record<string, string | undefined>;
	/** Target ("streef") label per selected zone code. */
	targets: Record<string, string | undefined>;
	/** Tooltip text for target label cells per selected zone code. */
	targetTooltips: Record<string, string | undefined>;
}

/** The full passport table model consumed by the view. */
export interface Passport {
	/** Selected zone codes, in selection order (the table columns). */
	zones: Array<string>;
	/** One row per configured data layer. */
	rows: Array<PassportRow>;
}

export interface ResolvedDataLayer {
	layerId: string;
	title: string;
	attribute: string;
	layer: GeoJsonLayer;
}

/**
 * Owns all non-UI logic for the Zonal Statistics tool: resolving the
 * configured zone + data layers, ensuring their data is loaded, handling map
 * clicks to (de)select PC6 zones, highlighting the selection, and building the
 * "labelpaspoort" table. UI components subscribe to the exposed stores.
 */
export class ZonalStatisticsController {
	private readonly map: CesiumMap;
	public readonly settings: ZonalStatisticsSettings;

	/** Whether the tool is active and should react to map clicks. */
	public readonly active: Writable<boolean> = writable(false);
	/** Currently selected zones, in selection order. */
	public readonly selectedZones: Writable<Array<SelectedZone>> = writable([]);

	private zoneLayer: GeoJsonLayer | undefined;
	/** Resolved data layers per config id, in config order. */
	private readonly dataLayers: Array<ResolvedDataLayer> = [];
	/** Resolved data layers exposed to the zonal panel UI. */
	public readonly resolvedDataLayers: Writable<Array<ResolvedDataLayer>> = writable([]);
	/** Per data-layer index: zone code -> feature properties. */
	private readonly valueIndex: Map<string, Map<string, Record<string, any>>> = new Map();

	/** Dedicated data source that draws outlines around selected zones. */
	private highlightSource: Cesium.CustomDataSource | undefined;
	/** The zone currently shown in the passport table (drawn light blue). */
	private activeCode: string | undefined;
	private readonly unsubscribers: Array<Unsubscriber> = [];
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

		for (const cfg of this.settings.layers) {
			const layer = this.map.getLayerById(cfg.id) as GeoJsonLayer | undefined;
			if (!layer) {
				console.warn(`zonalStatistics: data layer '${cfg.id}' not found in map layers`);
				continue;
			}
			await this.ensureLoaded(layer);
			this.dataLayers.push({
				layerId: cfg.id,
				title: layer.config.title,
				attribute: cfg.attribute,
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

		this.toggleZone(String(rawCode), entity);
	}

	/** Add or remove a zone from the selection. */
	public toggleZone(code: string, entity?: Cesium.Entity): void {
		const current = get(this.selectedZones);
		if (current.some((z) => z.code === code)) {
			this.removeHighlight(code);
			this.selectedZones.set(current.filter((z) => z.code !== code));
		} else {
			if (entity) this.addHighlight(code, entity);
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
	 * Mark the zone currently shown in the passport table so it gets a light blue
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

	/** Build one passport row for a resolved data layer across selected zones. */
	private buildPassportRow(
		dl: ResolvedDataLayer,
		zones: Array<string>,
		valueTooltipAttr: string | undefined,
		targetAttr: string | undefined,
		targetTooltipAttr: string | undefined
	): PassportRow {
		const index = this.valueIndex.get(dl.layerId);
		const values: Record<string, string | undefined> = {};
		const valueTooltips: Record<string, string | undefined> = {};
		const targets: Record<string, string | undefined> = {};
		const targetTooltips: Record<string, string | undefined> = {};

		for (const code of zones) {
			const props = index?.get(code);
			values[code] = this.toOptionalString(props?.[dl.attribute]);
			valueTooltips[code] = this.readOptionalAttribute(props, valueTooltipAttr);
			targets[code] = this.readOptionalAttribute(props, targetAttr);
			targetTooltips[code] = this.readOptionalAttribute(props, targetTooltipAttr);
		}

		return {
			layerId: dl.layerId,
			title: dl.title,
			values,
			valueTooltips,
			targets,
			targetTooltips
		};
	}

	/**
	 * Build the passport table for the current selection: one row per configured
	 * data layer, one column per selected zone, plus a target label per row.
	 */
	public buildPassport(): Passport {
		const zones = get(this.selectedZones).map((z) => z.code);
		const valueTooltipAttr = this.settings.labelTooltipAttribute;
		const targetAttr = this.settings.targetLabelAttribute;
		const targetTooltipAttr = this.settings.targetLabelTooltipAttribute;

		const rows: Array<PassportRow> = this.dataLayers.map((dl) =>
			this.buildPassportRow(dl, zones, valueTooltipAttr, targetAttr, targetTooltipAttr)
		);

		return { zones, rows };
	}

	/** Resolved data layers used by the zonal statistics left panel. */
	public getResolvedDataLayers(): Array<ResolvedDataLayer> {
		return get(this.resolvedDataLayers);
	}

	/** Detach listeners and remove highlight graphics. */
	public destroy(): void {
		this.unsubscribers.forEach((unsub) => unsub());
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
