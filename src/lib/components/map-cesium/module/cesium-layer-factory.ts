import type { Cesium3DTileset, ImageryLayer } from "cesium";
import type { LayerConfig } from "$lib/components/map-core/layer-config"; 
import type { CesiumLayer } from "./layers/cesium-layer";
import type { Map } from "./map";

import { WmtsLayer } from "./layers/wmts-layer";
import { ThreedeeLayer } from "./layers/threedee-layer";
import { WmsLayer } from "./layers/wms-layer";
import { BasiskaartLayer } from "./layers/basiskaart-layer";
import { WellsLayer } from "./layers/wells/wells-layer";
import { VectorTilesLayer } from "./layers/vector-tiles-layer";
import { I3sLayer } from "./layers/i3s-layer";
import { ModelAnimation } from "./layers/model-animation";
import { GeoJsonLayer } from "./layers/geojson-layer";
import { ArcGISLayer } from "./layers/arcgis-layer";
import { DroppedGLBLayer } from "./layers/dropped-glb-layer";
import { FloodLayer } from "./layers/flood-layer";
import { WfsLayer } from "./layers/wfs-layer";
import { OgcFeaturesLayer } from "./layers/ogc-features-layer";

export class CesiumLayerFactory {
	public convert(map: Map, config: LayerConfig): CesiumLayer<unknown> | undefined {
		switch (config.type) {
			case "wms":
				return this.createWms(map, config);
			case "wmts":
				return this.createWmts(map, config);
			case "wfs":
				return this.createWfs(map, config);
			case "arcgis":
				return this.createArcGIS(map, config);
			case "basiskaart":
				return this.createBasiskaart(map, config);
			case "vectortiles":
				return this.createVectorTilesLayer(map, config);
			case "3dtiles":
				return this.create3DTiles(map, config);
			case "json":
				return this.createGeoJsonLayer(map, config);
			case "geojson":
				return this.createGeoJsonLayer(map, config);
			case "ogc-features":
				return this.createOgcFeaturesLayer(map, config);
			/* Shapefile support built in via shapefile NPM module and GeoJSON layer, but not enabled
			case "shapefile": 
				return this.createGeoJsonLayer(map, config);
			*/
			case "flood":
				return this.createFloodLayer(map, config);
			case "modelanimation":
				return this.createModelAnimation(map, config);
			case "dropped-glb":
				return this.createDroppedGLBLayer(map, config);
			case "custom":
				return this.createCustom(map, config);
			default:
				return undefined;
		}
	}

	private createCustom(map: Map, layerConfig: LayerConfig): CesiumLayer<unknown> | undefined{;
		const wells = layerConfig.settings["wells"] ?? "false"
		const i3s = layerConfig.settings["i3s"] ?? "false"
	
		if(wells === "true") {
			return this.createWellsLayer(map, layerConfig);
		}

		if(i3s === "true") {
			return this.createI3sLayer(map, layerConfig);
		}

		return undefined;
	}

	private create3DTiles(map: Map, layerConfig: LayerConfig): CesiumLayer<Cesium3DTileset> {
		return new ThreedeeLayer(map, layerConfig);
	}

	private createVectorTilesLayer(map: Map, layerConfig: LayerConfig): CesiumLayer<ImageryLayer> {
		return new VectorTilesLayer(map, layerConfig);
	}

	private createWms(map: Map, layerConfig: LayerConfig): CesiumLayer<ImageryLayer> {
		layerConfig.settings.url = this.addSld(layerConfig.settings.url, layerConfig.settings.sld);
		return new WmsLayer(map, layerConfig);
	}

	private createWellsLayer(map: Map, layerConfig: LayerConfig): WellsLayer {
		return new WellsLayer(map, layerConfig);
	}

	private createI3sLayer(map: Map, layerConfig: LayerConfig): I3sLayer {
		return new I3sLayer(map, layerConfig);
	}

	private createWmts(map: Map, layerConfig: LayerConfig): CesiumLayer<ImageryLayer> {
		return new WmtsLayer(map, layerConfig);
	}

	private createWfs(map: Map, layerConfig: LayerConfig): WfsLayer {
		return new WfsLayer(map, layerConfig);
	}

	private createArcGIS(map: Map, layerConfig: LayerConfig): CesiumLayer<ImageryLayer> {
		return new ArcGISLayer(map, layerConfig);
	}

	private createBasiskaart(map: Map, layerConfig: LayerConfig): CesiumLayer<ImageryLayer> {
		return new BasiskaartLayer(map, layerConfig);
	}

	private createGeoJsonLayer(map: Map, layerConfig: LayerConfig): GeoJsonLayer {
		return new GeoJsonLayer(map, layerConfig);
	}

	private createOgcFeaturesLayer(map: Map, layerConfig: LayerConfig): OgcFeaturesLayer {
		return new OgcFeaturesLayer(map, layerConfig);
	}

	private createDroppedGLBLayer(map: Map, layerConfig: LayerConfig): CesiumLayer<unknown> {
		return new DroppedGLBLayer(map, layerConfig);
	}

	private createFloodLayer(map: Map, layerConfig: LayerConfig): CesiumLayer<unknown> {
		return new FloodLayer(map, layerConfig);
	}

	private createModelAnimation(map: Map, layerConfig: LayerConfig): ModelAnimation {
		return new ModelAnimation(map, layerConfig);
	}

	private getParamPrefix(url: string) {
		return url.includes("?") ? "&" : "?";
	}

	private addSld(baseUrl: string, sld: string) {
		let newUrl = baseUrl;
		if (sld) {
			newUrl = `${baseUrl}${this.getParamPrefix(baseUrl)}SLD=${sld}`;
		}

		return newUrl;
	}
}
