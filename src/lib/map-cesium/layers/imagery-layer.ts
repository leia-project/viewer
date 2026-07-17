import { get } from "svelte/store";
import * as Cesium from "cesium";
import type { ImageryLayer } from "cesium";
import type { LayerConfig } from "$lib/map-core/layer-config";
import { CesiumLayer } from "./cesium-layer";
import type { Map } from "../map";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import { fetchLayerBoundingBox } from "$lib/components/tools/MapToolLayerLibrary/CustomLayers/capabilities";

export abstract class CesiumImageryLayer extends CesiumLayer<ImageryLayer> {
	private boundingSphere: Cesium.BoundingSphere | undefined;

	constructor(map: Map, config: LayerConfig) {
		config.transparent = true;
		super(map, config);
	}

	public abstract createLayer(): void;

	/**
	 * Derives config.cameraPosition from the layer's geographic bounding box in
	 * the service's GetCapabilities, enabling the layer manager's zoom-to-extent
	 * button. No-op when a cameraPosition is already configured. Recomputes when
	 * the 2D/3D mode toggles.
	 */
	protected async setBoundingBoxCameraPosition(type: "wms" | "wmts"): Promise<void> {
		if (this.config.cameraPosition) return;
		const boundingBox = await fetchLayerBoundingBox(
			this.config.settings["url"],
			this.config.settings["featureName"],
			type
		);
		if (!boundingBox || this.config.cameraPosition) return;
		const rectangle = Cesium.Rectangle.fromDegrees(
			boundingBox.west,
			boundingBox.south,
			boundingBox.east,
			boundingBox.north
		);
		this.boundingSphere = Cesium.BoundingSphere.fromRectangle3D(rectangle);
		this.updateCameraPosition(get(this.map.options.use3DMode));
		this.map.options.use3DMode.subscribe((use3DMode) => this.updateCameraPosition(use3DMode));
	}

	private updateCameraPosition(use3DMode: boolean): void {
		if (!this.boundingSphere) return;
		this.config.cameraPosition = getCameraPositionFromBoundingSphere(this.boundingSphere, use3DMode);
	}

	protected startLoading(): void {
		this.createLayer();
	}

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
