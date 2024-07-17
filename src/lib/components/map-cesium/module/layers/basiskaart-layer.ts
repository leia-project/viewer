import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

export class BasiskaartLayer extends CesiumImageryLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
	}

	createLayer() {
		const provider = new Cesium.WebMapTileServiceImageryProvider({
			url: this.config.settings["url"] + "{TileMatrix}/{TileCol}/{TileRow}.png",
			layer: "",
			style: "",
			format: "image/png",
			tileMatrixSetID: "",
			//rectangle: rect,
		});

		this.source = new Cesium.ImageryLayer(provider, {});
	}
}
