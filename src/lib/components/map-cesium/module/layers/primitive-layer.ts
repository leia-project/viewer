import { CesiumLayer } from "./cesium-layer";
import { get } from "svelte/store";
import type { Cesium3DTileset } from "cesium";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";

export abstract class PrimitiveLayer extends CesiumLayer<Cesium3DTileset> {
	constructor(map: Map, config: LayerConfig) {
		config.transparent = false;
		super(map, config);
	}

	public addToMap(): void {
		this.map.viewer.scene.primitives.add(this.source);

		if (get(this.visible) === true) {
			this.show();
		} else {
			this.hide();
		}
	}

	public removeFromMap(): void {
		const idx = this.getPrimitiveIndex();
		if (idx !== -1) {
			const p = this.map.viewer.scene.primitives.get(idx);
			this.map.viewer.scene.primitives.remove(p);
		} else {
			this.map.viewer.scene.primitives.remove(this.source);
		}

		try {
			this.source = this.source && this.source.destroy();
		} catch (error) {
			return;
		}
	}

	public show(): void {
		if (this.source) {
			this.source.show = true;
			this.map.refresh();
		}
	}

	public hide(): void {
		if (this.source) {
			this.source.show = false;
			this.map.refresh();
		}
	}

	public opacityChanged(opacity: number): void {
		if (this.source) {
			//this.source.alpha = opacity > 1 ? 1.0 : opacity < 0 ? 0 : opacity;
		}
	}
}
