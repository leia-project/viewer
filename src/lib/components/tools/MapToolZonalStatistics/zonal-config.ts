/**
 * Configuration types and parsing for the Zonal Statistics tool.
 *
 * The tool is generic: it renders one table row per configured data layer and
 * one or more configurable columns per selected zone. Each column reads an
 * attribute from the row-layer's feature for that zone, so the same tool can
 * show categorical labels, numeric statistics, or any mix of attributes.
 *
 * A data layer is an attribute join on the zone geometry, so it needs no map layer of its own:
 * each entry describes itself (title, group, dataset url) and defaults to the zone layer's dataset.
 * When a map layer with the same id does exist, its title/group/url/metadata/opacity are used as
 * fallbacks so configurations that list their data layers as real layers keep working.
 *
 * It is configured through the viewer config `tools` array, e.g.:
 *
 * {
 *   "id": "zonalStatistics",
 *   "enabled": true,
 *   "settings": {
 *     "zoneLayerId": "pc6-zones",
 *     "zoneCodeAttribute": "postcode",
 *     "layers": [
 *       { "id": "heat", "title": "Heat", "groupId": "climate" },
 *       { "id": "drought", "title": "Drought", "columns": { "ambition": { "attribute": "label_ca" } } }
 *     ],
 *     "columns": [
 *       { "key": "ambition", "attribute": "value", "label": "Value", "tooltipAttribute": "description", "styled": true }
 *     ]
 *   }
 * }
 */

/** Opacity (0…100) a data layer's fill gets when its own config entry omits one. */
export const DEFAULT_LAYER_OPACITY = 80;

/**
 * Config value a zone/cell without a value is looked up under, in both the zone layer's
 * `classMapping` (map colours) and `valueStyles` (table colours), so one entry covers both.
 */
export const NODATA_VALUE = "null";

/**
 * Per-layer override of the source attributes a column reads. Lets datasets that
 * name the same logical column differently still feed one table column.
 */
export interface ZonalColumnSource {
	/** Attribute holding this column's value in this layer's features. */
	attribute?: string;
	/** Attribute holding this column's tooltip text in this layer's features. */
	tooltipAttribute?: string;
}

export interface ZonalLayer {
	/** Unique id of the layer (used as a stable key). Provides one table row. */
	id: string;
	/** Row/card label (defaults to a map layer with the same id, else the id itself). */
	title?: string;
	/** Id of a config `groups` entry, used to group the panel's cards. */
	groupId?: string;
	/** GeoJSON url the attributes are read from (defaults to the zone layer's dataset). */
	url?: string;
	/** Human-readable metadata page linked from the panel card. */
	metadataUrl?: string;
	/** Opacity of this layer's colours on the zone geometry (0…100, defaults to 80). */
	opacity?: number;
	/** Source-attribute overrides for this layer, keyed by column `key` (or its `attribute`). */
	columns?: Record<string, ZonalColumnSource>;
}

/**
 * A column shown for every selected zone. Each column reads `attribute` from
 * the row-layer's feature for that zone. Columns make the tool generic: use a
 * single column for a plain statistic, or several columns to compare values
 * (e.g. a current value next to a target value).
 */
export interface ZonalColumn {
	/** Stable id used by per-layer `columns` overrides. Defaults to `attribute`. */
	key?: string;
	/** Default attribute name read for this column; a layer may override it. */
	attribute: string;
	/** Column header text (defaults to `attribute`). */
	label?: string;
	/** Optional number of decimals to round numeric values to (e.g. 0, 1, 2), max 20. */
	decimals?: number;
	/** Default attribute holding tooltip/description text; a layer may override it. */
	tooltipAttribute?: string;
	/** When true, cell colours come from `valueStyles` (categorical columns). */
	styled?: boolean;
	/**
	 * Whether this column is shown in the interactive table and PNG/JPEG image export.
	 * Defaults to false when omitted.
	 */
	hideInTable?: boolean;
	/**
	 * Whether this column is shown in PNG/JPEG image exports.
	 * Defaults to false when omitted.
	 */
	hideInImageExport?: boolean;
}

/**
 * Maps a (categorical) cell value to a colour so the table, legend and exports
 * can render it. Deployment-specific; the tool ships no built-in palette.
 */
export interface ZonalValueStyle {
	/** Cell value to match, case-insensitively. */
	value: string;
	/** Background colour (any CSS/hex colour). Text colour is derived for contrast. */
	color: string;
	/** Optional legend label (defaults to `value`). */
	label?: string;
}

export interface ZonalStatisticsSettings {
	/** Id of the layer holding the zonal (vector) geometries. */
	zoneLayerId: string;
	/** Attribute on a zone feature that holds its code (e.g. a postcode). */
	zoneCodeAttribute: string;
	/** The data layers (statistics) shown as table rows. */
	layers: Array<ZonalLayer>;
	/** The columns rendered per selected zone. */
	columns: Array<ZonalColumn>;
	/** Optional value -> colour mapping used for styled cell colours + legend. */
	valueStyles: Array<ZonalValueStyle>;
	/** Optional title used for exports (defaults to the tool title). */
	exportTitle?: string;
	/** Optional file-name prefix for exports. */
	exportFileName?: string;
	/** Optional footer text drawn on exported PDFs. */
	pdfFooterText?: string;
	/** Optional left logo image path for exported PDFs (defaults to the shared branding logo). */
	pdfLogo?: string;
}

/**
 * Whether a column carries description text anywhere — either by default or
 * through a per-layer override. Drives the extra description column in exports.
 */
export function columnHasTooltip(settings: ZonalStatisticsSettings, column: ZonalColumn): boolean {
	if (column.tooltipAttribute) return true;
	const key = column.key ?? column.attribute;
	return settings.layers.some((layer) => layer.columns?.[key]?.tooltipAttribute !== undefined);
}

/**
 * Parse and validate the raw tool settings object into a typed
 * {@link ZonalStatisticsSettings}. Returns `undefined` when the settings are
 * missing or incomplete so callers can fail gracefully.
 */
export function parseZonalStatisticsSettings(raw: any): ZonalStatisticsSettings | undefined {
	if (!raw || typeof raw !== "object") {
		return undefined;
	}

	const zoneLayerId = typeof raw.zoneLayerId === "string" ? raw.zoneLayerId : undefined;
	if (!zoneLayerId) {
		console.warn("zonalStatistics: missing required setting 'zoneLayerId'");
		return undefined;
	}

	const normalizeDecimals = (value: unknown): number | undefined => {
		if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
		if (value < 0 || value > 20) return undefined;
		return value;
	};

	const parseColumnSource = (value: any): ZonalColumnSource => {
		// A bare string is shorthand for overriding just the value attribute.
		if (typeof value === "string") {
			return { attribute: value };
		}
		if (value && typeof value === "object") {
			return {
				attribute: typeof value.attribute === "string" ? value.attribute : undefined,
				tooltipAttribute:
					typeof value.tooltipAttribute === "string" ? value.tooltipAttribute : undefined
			};
		}
		return {};
	};

	const parseColumnSources = (raw: any): Record<string, ZonalColumnSource> | undefined => {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
		const sources: Record<string, ZonalColumnSource> = {};
		for (const [key, value] of Object.entries(raw as Record<string, any>)) {
			const source = parseColumnSource(value);
			if (source.attribute || source.tooltipAttribute) sources[key] = source;
		}
		return Object.keys(sources).length > 0 ? sources : undefined;
	};

	const normalizeOpacity = (value: unknown): number | undefined => {
		if (value === undefined) return undefined;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			console.warn(`zonalStatistics: ignoring non-numeric layer opacity '${value}'`);
			return undefined;
		}
		return Math.min(100, Math.max(0, value));
	};

	const layers: Array<ZonalLayer> = Array.isArray(raw.layers)
		? raw.layers
				.filter((l: any) => l && typeof l.id === "string")
				.map((l: any) => ({
					id: l.id,
					title: typeof l.title === "string" ? l.title : undefined,
					groupId: typeof l.groupId === "string" ? l.groupId : undefined,
					url: typeof l.url === "string" ? l.url : undefined,
					metadataUrl: typeof l.metadataUrl === "string" ? l.metadataUrl : undefined,
					opacity: normalizeOpacity(l.opacity),
					columns: parseColumnSources(l.columns)
				}))
		: [];

	const columns: Array<ZonalColumn> = Array.isArray(raw.columns)
		? raw.columns
				.filter((c: any) => c && typeof c.attribute === "string")
				.map((c: any) => ({
					key: typeof c.key === "string" ? c.key : undefined,
					attribute: c.attribute,
					label: typeof c.label === "string" ? c.label : undefined,
					decimals: normalizeDecimals(c.decimals),
					tooltipAttribute: typeof c.tooltipAttribute === "string" ? c.tooltipAttribute : undefined,
					styled: c.styled === true,
					hideInTable: typeof c.hideInTable === "boolean" ? c.hideInTable : undefined,
					hideInImageExport:
						typeof c.hideInImageExport === "boolean" ? c.hideInImageExport : undefined
				}))
		: [];

	if (columns.length === 0) {
		console.warn("zonalStatistics: missing required setting 'columns'");
		return undefined;
	}

	const valueStyles: Array<ZonalValueStyle> = Array.isArray(raw.valueStyles)
		? raw.valueStyles
				.filter((s: any) => s && typeof s.value === "string" && typeof s.color === "string")
				.map((s: any) => ({
					value: s.value,
					color: s.color,
					label: typeof s.label === "string" ? s.label : undefined
				}))
		: [];

	return {
		zoneLayerId,
		zoneCodeAttribute:
			typeof raw.zoneCodeAttribute === "string" ? raw.zoneCodeAttribute : "postcode",
		layers,
		columns,
		valueStyles,
		exportTitle: typeof raw.exportTitle === "string" ? raw.exportTitle : undefined,
		exportFileName: typeof raw.exportFileName === "string" ? raw.exportFileName : undefined,
		pdfFooterText: typeof raw.pdfFooterText === "string" ? raw.pdfFooterText : undefined,
		pdfLogo: typeof raw.pdfLogo === "string" ? raw.pdfLogo : undefined
	};
}
