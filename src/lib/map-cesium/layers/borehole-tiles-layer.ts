import { get } from "svelte/store";
import type { Cesium3DTileset } from "cesium";

import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";
import { ThreedeeLayer } from "./threedee-layer";
import { BoreholeDepthScaleController } from "../borehole-depth-scale";
import { applySubsurfaceExaggeration } from "../subsurface-exaggeration";

/**
 * BRO BHR-GT boreholes and CPT soundings rendered as a 3D Tiles tileset
 * (stacked-cylinder glb with EXT_mesh_gpu_instancing + EXT_structural_metadata).
 * Behaves like ThreedeeLayer for rendering, theming and feature-info, and
 * additionally:
 * - stretches with map.options.subsurfaceExaggeration and renders unlit,
 *   via applySubsurfaceExaggeration;
 * - draws a NAP depth scale next to the selected borehole, built from the
 *   `top_nap`/`bottom_nap` interval metadata.
 */
export class BoreholeTilesLayer extends ThreedeeLayer {
	private depthScaleController: BoreholeDepthScaleController;
	private disposeExaggeration: (() => void) | undefined;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.depthScaleController = new BoreholeDepthScaleController(
			map,
			() => this.source as Cesium3DTileset | undefined,
			() => get(this.visible)
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
