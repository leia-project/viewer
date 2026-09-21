import * as Cesium from "cesium";
import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

// Cesium sets these parameters itself (lowercase). If they are also present in the layer url
// they end up twice in the request, and servers react differently (GeoServer throws a
// ClassCastException). They are therefore removed from the query string; the values we can
// reuse (layers, styles, format, version) are passed to Cesium in lowercase.
const cesiumParameters = [
	"service", "request", "layers", "bbox", "width", "height", "crs", "srs",
	"styles", "format", "version", "transparent",
	// GetFeatureInfo uses the same url:
	"query_layers", "info_format", "i", "j", "x", "y"
];

interface ParsedUrl {
	url: string;
	parameters: Record<string, string>;
}

function parseUrl(url: string): ParsedUrl {
	const separator = url.indexOf("?");
	if (separator === -1) {
		return { url, parameters: {} };
	}

	const parameters: Record<string, string> = {};
	const query = new URLSearchParams(url.substring(separator + 1));
	for (const [key, value] of query) {
		parameters[key.toLowerCase()] = value;
	}

	return { url: url.substring(0, separator), parameters };
}

export class WmsLayer extends CesiumImageryLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.setBoundingBoxCameraPosition("wms");
	}

	createLayer(dropDownStyleName?: string): void {
		const { url, parameters: urlParameters } = parseUrl(this.config.settings["url"]);
		const layers = this.config.settings["featureName"] || urlParameters["layers"];
		const styles = dropDownStyleName || this.config.settings["styles"] || urlParameters["styles"] || "";
		const format = this.config.settings["contentType"] || urlParameters["format"] || "image/png";
		const version = this.config.settings["version"] || urlParameters["version"];

		// Other parameters from the url (token, cql_filter, ...) are preserved.
		const parameters: Record<string, string | boolean> = {};
		for (const [key, value] of Object.entries(urlParameters)) {
			if (!cesiumParameters.includes(key)) {
				parameters[key] = value;
			}
		}

		if (version) {
			parameters["version"] = version;
		}
		parameters["transparent"] = true;
		parameters["format"] = format;
		parameters["styles"] = styles;

		const provider = new Cesium.WebMapServiceImageryProvider({
			url: url,
			layers: layers,
			tilingScheme: this.config.settings["webMercator"]
				? new Cesium.WebMercatorTilingScheme({ ellipsoid: Cesium.Ellipsoid.WGS84 })
				: undefined,
			parameters: parameters,
		});
		this.source = new Cesium.ImageryLayer(provider, {
			alpha: this.getOpacity(this.config.opacity)
		});
	}

	switchLayer(dropDownStyleName?: string): void {
		this.removeFromMap();
		this.createLayer(dropDownStyleName);
	}
}
