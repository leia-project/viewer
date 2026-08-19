/**
 * Configuration types and parsing for the Zonal Statistics tool.
 *
 * The tool is generic: it renders one table row per configured data layer and
 * one or more configurable columns per selected zone. Each column reads an
 * attribute from the row-layer's feature for that zone, so the same tool can
 * show categorical labels, numeric statistics, or any mix of attributes.
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
 *       { "id": "heat" },
 *       { "id": "drought" }
 *     ],
 *     "columns": [
 *       { "attribute": "value", "label": "Value", "tooltipAttribute": "description", "styled": true }
 *     ]
 *   }
 * }
 */

export interface ZonalLayer {
	/** Unique id of the layer (used as a stable key). Provides one table row. */
	id: string;
	/** Optional row label (defaults to the layer's config title). */
	title?: string;
}

/**
 * A column shown for every selected zone. Each column reads `attribute` from
 * the row-layer's feature for that zone. Columns make the tool generic: use a
 * single column for a plain statistic, or several columns to compare values
 * (e.g. a current value next to a target value).
 */
export interface ZonalColumn {
	/** Attribute name read from the row-layer feature for this column's value. */
	attribute: string;
	/** Column header text (defaults to `attribute`). */
	label?: string;
	/** Optional attribute holding tooltip/description text for the cell. */
	tooltipAttribute?: string;
	/** When true, cell colours come from `valueStyles` (categorical columns). */
	styled?: boolean;
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
	/** Whether to show the computed summary section (area per category / numeric stats). Defaults to true. */
	showSummary: boolean;
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

	const layers: Array<ZonalLayer> = Array.isArray(raw.layers)
		? raw.layers
				.filter((l: any) => l && typeof l.id === "string")
				.map((l: any) => ({
					id: l.id,
					title: typeof l.title === "string" ? l.title : undefined
				}))
		: [];

	const columns: Array<ZonalColumn> = Array.isArray(raw.columns)
		? raw.columns
				.filter((c: any) => c && typeof c.attribute === "string")
				.map((c: any) => ({
					attribute: c.attribute,
					label: typeof c.label === "string" ? c.label : undefined,
					tooltipAttribute:
						typeof c.tooltipAttribute === "string" ? c.tooltipAttribute : undefined,
					styled: c.styled === true
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
		showSummary: raw.showSummary !== false,
		exportTitle: typeof raw.exportTitle === "string" ? raw.exportTitle : undefined,
		exportFileName: typeof raw.exportFileName === "string" ? raw.exportFileName : undefined,
		pdfFooterText: typeof raw.pdfFooterText === "string" ? raw.pdfFooterText : undefined,
		pdfLogo: typeof raw.pdfLogo === "string" ? raw.pdfLogo : undefined
	};
}
