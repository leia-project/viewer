import * as Cesium from "cesium";

import { GeoJsonLayer } from "./geojson-layer";

/**
 * BRO borehole *locations* as a GeoJSON point layer.
 *
 * This class adds only the borehole-specific post-load transforms via the
 * postLoad() hook, so no base behaviour is duplicated:
 */
export class BoreholePointsLayer extends GeoJsonLayer {
	protected postLoad(): void {
		this.renderPointsAsCircles();
	}

	private getPointHeightReference(): Cesium.HeightReference {
		if (this.config.settings.clampToTerrain) {
			return Cesium.HeightReference.CLAMP_TO_TERRAIN;
		}
		if (this.clampToGround) {
			return Cesium.HeightReference.CLAMP_TO_GROUND;
		}
		return Cesium.HeightReference.NONE;
	}

	private renderPointsAsCircles(): void {
		const style = this.config.settings.style;
		const pixelSize: number | undefined = style?.pointSize;
		if (pixelSize == null) {
			return;
		}

		const outlineColor = style?.stroke
			? Cesium.Color.fromCssColorString(style.stroke)
			: Cesium.Color.BLACK;
		const outlineWidth = style?.strokeWidth ?? 0;

		for (const entity of this.source.entities.values) {
			if (!entity.billboard) {
				continue;
			}
			entity.billboard = undefined;
			entity.point = new Cesium.PointGraphics({
				pixelSize,
				color: this.defaultColorPoint.withAlpha(this.alpha),
				outlineColor,
				outlineWidth,
				heightReference: this.getPointHeightReference(),
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			});
		}
	}
}
