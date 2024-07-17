import { PrimitiveLayer } from "./primitive-layer";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";

import type { Map } from "../map";


export class I3sLayer extends PrimitiveLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		
		this.createLayer();
		this.addListeners();
	}

	private addListeners(): void {

	}

	private async createLayer(): Promise<void> {
		const tileset = await Cesium.I3SDataProvider.fromUrl(this.config.settings["url"], {});

        //@ts-ignore
		this.source = tileset;
	}
}
