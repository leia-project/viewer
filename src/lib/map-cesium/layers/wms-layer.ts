import * as Cesium from "cesium";
import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

export class WmsLayer extends CesiumImageryLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.setBoundingBoxCameraPosition("wms");
	}

	createLayer(dropDownStyleName?: string): void {
		const provider = new Cesium.WebMapServiceImageryProvider({
			url: this.config.settings["url"].split("?")[0],
			layers: this.config.settings["featureName"],
			tilingScheme: this.config.settings["webMercator"]
				? new Cesium.WebMercatorTilingScheme({ ellipsoid: Cesium.Ellipsoid.WGS84 })
				: undefined,
			parameters: {
				transparent: true,
				format: this.config.settings["contentType"] ?? "image/png",
				styles: dropDownStyleName || this.config.settings["styles"] || "",
			},
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
