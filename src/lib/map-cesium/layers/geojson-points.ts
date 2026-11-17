import * as Cesium from "cesium";

export interface GeoJsonPointOptions {
	/** Circle diameter in pixels */
	pixelSize: number;
	color: Cesium.Color;
	outlineColor: Cesium.Color;
	outlineWidth: number;
	heightReference: Cesium.HeightReference;
}

/**
 * GeoJSON point features load as billboards (map pins). This replaces them by
 * circles, which the layer's style-by-property code can colour (it writes
 * `entity.point.color`, which a billboard does not have). Circles are always
 * drawn on top so they stay visible next to 3D Tiles layers.
 */
export function convertBillboardsToPoints(
	source: Cesium.GeoJsonDataSource,
	options: GeoJsonPointOptions
): void {
	for (const entity of source.entities.values) {
		if (!entity.billboard) {
			continue;
		}
		entity.billboard = undefined;
		entity.point = new Cesium.PointGraphics({
			...options,
			disableDepthTestDistance: Number.POSITIVE_INFINITY
		});
	}
}
