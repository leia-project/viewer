import { CesiumLayer } from "./cesium-layer";
import { get } from "svelte/store";

import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";
import type { CustomDataSource } from "cesium";

export abstract class CustomLayer extends CesiumLayer<CustomDataSource> {
    constructor(map: Map, config: LayerConfig) {
		config.transparent = false;
		super(map, config);
	}

	public addToMap(): void {
		this.map.viewer.dataSources.add(this.source);

		if (get(this.visible) === true) {
			this.show();
		} else {
			this.hide();
		}
	}

	public removeFromMap(): void {
		const idx = this.getPrimitiveIndex();
		if (idx !== -1) {
			//const p = this.map.viewer.scene.primitives.get(idx);
			//this.map.viewer.scene.primitives.remove(p);
		} else {
			//this.map.viewer.scene.primitives.remove(this.source);
		}

		try {
			this.source.entities.removeAll();
			this.source = undefined;
		} catch (error) {
			return;
		}
	}

	public opacityChanged(opacity: number): void {
		if (this.source) {
			//this.source.alpha = opacity > 1 ? 1.0 : opacity < 0 ? 0 : opacity;
		}
	}
}