import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";

import { OgcFeaturesProviderCesium } from "../providers/ogc-features-provider";
import { CesiumLayer } from "./cesium-layer";
import { get } from "svelte/store";


export class OgcFeaturesLayer extends CesiumLayer<OgcFeaturesProviderCesium> {

    constructor(map: Map, config: LayerConfig, timesliderValue: Writable<number>) {
        super(map, config);
        this.source = new OgcFeaturesProviderCesium(this.config.settings.url, this.config.settings.options, timesliderValue, this.config.settings.parameters);
    }

    public async addToMap(): Promise<void> {
        this.source.addToMap(this.map, get(this.visible));
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
}