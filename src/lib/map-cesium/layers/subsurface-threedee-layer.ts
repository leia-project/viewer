import type { Cesium3DTileset } from "cesium";

import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";
import { ThreedeeLayer } from "./threedee-layer";
import { TilesetDepthScaleController, depthScaleKeys } from "../tileset-depth-scale";
import { applySubsurfaceExaggeration } from "../subsurface-exaggeration";

/**
 * 3D Tiles layer with `settings.subsurface: true`: vertical columns below the
 * surface (boreholes, CPTs, wells, ...). Behaves like ThreedeeLayer for
 * rendering, theming and feature-info, and additionally:
 * - stretches about datum 0 and renders unlit, via applySubsurfaceExaggeration;
 * - draws a depth scale along the clicked column, from the interval metadata
 *   named in `settings.depthScale`.
 */
export class SubsurfaceThreedeeLayer extends ThreedeeLayer {
	private depthScaleController: TilesetDepthScaleController;
	private disposeExaggeration: (() => void) | undefined;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.depthScaleController = new TilesetDepthScaleController(
			map,
			() => this.source as Cesium3DTileset | undefined,
			this.visible,
			depthScaleKeys(config)
		);
	}

	protected onTilesetLoaded(tileset: Cesium3DTileset): void {
		this.disposeExaggeration = applySubsurfaceExaggeration(this.map, tileset);
	}

	public addToMap(): void {
		super.addToMap();
		this.depthScaleController.start();
	}

	public removeFromMap(): void {
		this.disposeExaggeration?.();
		this.disposeExaggeration = undefined;
		this.depthScaleController.stop();
		super.removeFromMap();
	}
}
