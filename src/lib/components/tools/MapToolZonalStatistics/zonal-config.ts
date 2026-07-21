/**
 * Configuration types and parsing for the Zonal Statistics tool.
 *
 * The tool is configured through the viewer config `tools` array, e.g.:
 *
 * {
 *   "id": "zonalStatistics",
 *   "enabled": true,
 *   "settings": {
 *     "zoneLayerId": "pc6-zones",
 *     "zoneCodeAttribute": "postcode",
 *     "targetLabelAttribute": "streeflabel",
 *     "layers": [
 *       { "id": "heat", "attribute": "label_hitte" }
 *     ]
 *   }
 * }
 */

export interface ZonalLayer {
	/** Unique id of the layer (used as a stable key). */
	id: string;
	/** Attribute name on the zone feature that holds this layer's label value. */
	attribute: string;
}

export interface ZonalStatisticsSettings {
	/** Id of the layer holding the PC6 zonal (vector) geometries. */
	zoneLayerId: string;
	/** Attribute on a zone feature that holds its code (e.g. the PC6 code). */
	zoneCodeAttribute: string;
	/** Optional attribute holding the target ("streef") label for a zone. */
	targetLabelAttribute?: string;
	/** The data layers (climate labels) shown in the passport table. */
	layers: Array<ZonalLayer>;
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
				.filter((l: any) => l && typeof l.id === "string" && typeof l.attribute === "string")
				.map((l: any) => ({
					id: l.id,
					attribute: l.attribute
				}))
		: [];

	return {
		zoneLayerId,
		zoneCodeAttribute: typeof raw.zoneCodeAttribute === "string" ? raw.zoneCodeAttribute : "postcode",
		targetLabelAttribute:
			typeof raw.targetLabelAttribute === "string" ? raw.targetLabelAttribute : undefined,
		layers
	};
}
