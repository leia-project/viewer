import * as Cesium from "cesium";

import { GeoJsonLayer } from "./geojson-layer";

/**
 * BRO object *locations* (BHR-GT boreholes, CPTs) as a GeoJSON point layer.
 *
 * This class adds only the BRO-specific post-load transforms via the
 * postLoad() hook, so no base behaviour is duplicated:
 */
export class BroPointsLayer extends GeoJsonLayer {
	private pointOutlineColor?: Cesium.Color;

	protected postLoad(): void {
		this.convertBillboardsToPoints();
	}

	public opacityChanged(opacity: number): void {
		super.opacityChanged(opacity);
		this.updatePointOutlineOpacity();
	}

	private updatePointOutlineOpacity(): void {
		if (!this.source || !this.pointOutlineColor) {
			return;
		}
		const outlineColor = new Cesium.ConstantProperty(this.pointOutlineColor.withAlpha(this.alpha));
		for (const entity of this.source.entities.values) {
			if (entity.point) {
				entity.point.outlineColor = outlineColor;
			}
		}
		this.map.refresh();
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

	private convertBillboardsToPoints(): void {
		const style = this.config.settings.style;
		const pixelSize: number | undefined = style?.pointSize;
		if (pixelSize == null) {
			return;
		}

		this.pointOutlineColor = style?.stroke
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
				outlineColor: this.pointOutlineColor.withAlpha(this.alpha),
				outlineWidth,
				heightReference: this.getPointHeightReference(),
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			});
		}
	}
}
