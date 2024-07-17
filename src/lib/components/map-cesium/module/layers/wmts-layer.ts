import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

export class WmtsLayer extends CesiumImageryLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
	}

	createLayer() {
		const tileMatrixLabels = this.config.settings["matrixids"] ?? [
			"EPSG:3857:0",
			"EPSG:3857:1",
			"EPSG:3857:2",
			"EPSG:3857:3",
			"EPSG:3857:4",
			"EPSG:3857:5",
			"EPSG:3857:6",
			"EPSG:3857:7",
			"EPSG:3857:8",
			"EPSG:3857:9",
			"EPSG:3857:10",
			"EPSG:3857:11",
			"EPSG:3857:12",
			"EPSG:3857:13",
			"EPSG:3857:14",
			"EPSG:3857:15",
			"EPSG:3857:16",
			"EPSG:3857:17",
			"EPSG:3857:18",
			"EPSG:3857:19"
		]

		const provider = new Cesium.WebMapTileServiceImageryProvider({
			url: this.config.settings.url,
			layer: this.config.settings["featureName"],
			style: this.config.settings["style"] ?? "default",
			format: this.config.settings["contentType"] ? this.config.settings["contentType"] : "image/png",
			tilingScheme: new Cesium.WebMercatorTilingScheme({
				ellipsoid: Cesium.Ellipsoid.WGS84
			}),
			tileWidth: this.config.settings["tileWidth"] ?? 256,
			tileHeight: this.config.settings["tileHeigth"] ?? 256,
			tileMatrixSetID: this.config.settings["tileMatrixSetID"] ?? "EPSG:3857",
			tileMatrixLabels: tileMatrixLabels.length === 0 ? undefined : tileMatrixLabels,
			maximumLevel: this.config.settings["maximumLevel"] ?? tileMatrixLabels.length === 0 ? undefined : tileMatrixLabels.length - 1
		});
		this.source = new Cesium.ImageryLayer(provider, {});
	}
}
