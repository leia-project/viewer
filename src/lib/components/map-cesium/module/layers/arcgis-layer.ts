import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

export class ArcGISLayer extends CesiumImageryLayer {
	
	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.createLayer();
	}

	async createLayer(): Promise<void> {

		const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(this.config.settings["url"], {
			layers: this.config.settings["layers"],
			enablePickFeatures: true
		});
		this.source = new Cesium.ImageryLayer(provider, {});
	}
}
