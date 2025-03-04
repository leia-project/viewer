import { CesiumLayer } from "./cesium-layer";
import { get } from "svelte/store";
import type { ImageryLayer } from "cesium";
import type { Map } from "../map";
import type { LayerConfig } from "$lib/components/map-core/layer-config";

export abstract class CesiumImageryLayer extends CesiumLayer<ImageryLayer> {
	constructor(map: Map, config: LayerConfig) {
		config.transparent = true;
		super(map, config);
		this.createLayer();
	}

	public abstract createLayer(): void;

	public addToMap(): void {
		if (this.config.isBackground) {
			this.map.viewer.imageryLayers.add(this.source, 0);
		} else {
			this.map.viewer.imageryLayers.add(this.source);
		}

		if (get(this.visible) === true) {
			this.show();
		} else {
			this.hide();
		}
	}

	public removeFromMap(): void {
		const idx = this.getSourceIndex();
		if (idx !== -1) {
			const p = this.map.viewer.imageryLayers.get(idx);
			this.map.viewer.imageryLayers.remove(p);
		} else {
			this.map.viewer.imageryLayers.remove(this.source);
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
			this.source.alpha = this.getOpacity(opacity);
			this.map.refresh();
		}
	}

	public getOpacity(opacity: number | undefined): number {
		if (opacity === undefined) return 1.0;
		opacity = opacity / 100;
		return opacity > 1 ? 1.0 : opacity < 0 ? 0 : opacity;
	}
}
