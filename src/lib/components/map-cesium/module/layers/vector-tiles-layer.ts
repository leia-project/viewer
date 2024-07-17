import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import VectorImageryProvider from "../providers/vector-imagery-provider";
import { CesiumImageryLayer } from "./imagery-layer";

export class VectorTilesLayer extends CesiumImageryLayer {
	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.createLayer();
	}

	private createLayer() {
		const provider = new VectorImageryProvider(this.config.settings["url"], {});
		this.source = new Cesium.ImageryLayer(provider);
	}
}
