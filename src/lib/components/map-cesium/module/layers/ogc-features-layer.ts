import { get } from "svelte/store";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";

import { OgcFeaturesProviderCesium } from "../providers/ogc-features-provider";
import { CesiumLayer } from "./cesium-layer";

import * as Cesium from "cesium";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import LayerControlOgcFeaturesLayer from "../../LayerControls/LayerControlOGCFeaturesLayer.svelte";


export class OgcFeaturesLayer extends CesiumLayer<OgcFeaturesProviderCesium> {

	constructor(map: Map, config: LayerConfig) {
        super(map, config);
        this.source = new OgcFeaturesProviderCesium(map, this.config.settings.url, this.config.settings.options, this.config.settings.parameters);
        this.addControl();
    }

    public async addToMap(): Promise<void> {
        this.source.init(get(this.visible));
    }

    public removeFromMap(): void {
        this.source.hide();
    }

    public show(): void {
        if (this.source) {
            this.source.show();
        }
    }

    public hide(): void {
        if (this.source) {
            this.source.hide();
        }
    }

    public opacityChanged(opacity: number): void {
        if (this.source) {
            this.source.setOpacity(opacity);
        }
    }

    private addControl(): void {
        const layerControl = new CustomLayerControl();
        layerControl.component = LayerControlOgcFeaturesLayer;
        layerControl.props = {
            style: this.config.settings.options.style,
        };
        this.addCustomControl(layerControl);
    }
}