import { get } from "svelte/store";
import type { Cesium3DTileset } from "cesium";

import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";
import { ThreedeeLayer } from "./threedee-layer";
import { BoreholeDepthScaleController } from "../borehole-depth-scale";

/**
 * BRO BHR-GT boreholes rendered as a 3D Tiles tileset (stacked-cylinder glb with
 * EXT_structural_metadata). Behaves like ThreedeeLayer for rendering, theming and
 * feature-info, additionally drawing a NAP depth scale next to the selected
 * borehole.
 *
 * The depth scale is built the glb which contians
 * `top_nap`/`bottom_nap` per interval, the controller aggregates them per
 * borehole on selection.
 */
export class BoreholeTilesLayer extends ThreedeeLayer {
	private depthScaleController: BoreholeDepthScaleController;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.depthScaleController = new BoreholeDepthScaleController(
			map,
			() => this.source as Cesium3DTileset | undefined,
			() => get(this.visible)
		);
	}

	public addToMap(): void {
		super.addToMap();
		this.depthScaleController.start();
	}

	public removeFromMap(): void {
		this.depthScaleController.stop();
		super.removeFromMap();
	}
}
