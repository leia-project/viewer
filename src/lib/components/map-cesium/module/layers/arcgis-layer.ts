import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import LayerControlArcGis from "../../LayerControlArcGis/LayerControlArcGis.svelte";

export class ArcGISLayer extends CesiumImageryLayer {
	private layerControl!: CustomLayerControl;
	private legendUrls: { srcStrings: string[]; legendNames: string[] } | undefined;
	constructor(map: Map, config: LayerConfig) {
		super(map, config);
	}

	async createLayer(): Promise<void> {
		const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(this.config.settings.url, {
			layers: this.config.settings.layers,
			enablePickFeatures: true
		});
		this.source = new Cesium.ImageryLayer(provider, {});
		this.legendUrls = await this.getLegendUrl();
		this.addControl();
	}

	private async getLegendUrl(): Promise<{ srcStrings: string[]; legendNames: string[] }> {
		const response = await fetch(`${this.config.settings.url}/legend?f=pjson`);
		const body = await response.json();
		const layerLegendInfo = body.layers.find((layer: any) => {
			return layer.layerId.toString() === this.config.settings.layers;
		});

		let srcStrings: string[] = [];
		let legendNames: string[] = [];
		for (let i = 0; i < layerLegendInfo.legend.length; i++) {
			srcStrings.push(
				`data:${layerLegendInfo.legend[i].contentType};base64,${layerLegendInfo.legend[i].imageData}`
			);
			legendNames.push(
				layerLegendInfo.legend[i].label
					? layerLegendInfo.legend[i].label
					: layerLegendInfo.layerName
			);
		}

		return { srcStrings, legendNames };
	}

	private addControl(): void {
		this.layerControl = new CustomLayerControl();
		this.layerControl.component = LayerControlArcGis;
		this.layerControl.props = {
			legendUrls: this.legendUrls
		};
		this.addCustomControl(this.layerControl);
	}

	private removeControl(): void {
		this.removeCustomControl(this.layerControl);
	}

	public removeFromMap(): void {
		super.removeFromMap();
		this.removeControl();
	}
}
