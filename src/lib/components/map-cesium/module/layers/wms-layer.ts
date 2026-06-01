import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

export class WmsLayer extends CesiumImageryLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
	}

	createLayer(dropDownStyleName?: string): void {
		const provider = new Cesium.WebMapServiceImageryProvider({
			url: this.config.settings["url"],
			layers: this.config.settings["featureName"],
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
