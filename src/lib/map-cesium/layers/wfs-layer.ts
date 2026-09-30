import { get } from "svelte/store";
import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map } from "../map";

import { CesiumLayer } from "./cesium-layer";
import { WFSProviderCesium } from "../providers/wfs-provider";


export class WfsLayer extends CesiumLayer<WFSProviderCesium> {
    constructor(map: Map, config: LayerConfig) {
        super(map, config);
    }

    // Lazy loading: the source is created the first time the layer is activated
    protected startLoading(): void {
        this.source = new WFSProviderCesium(this.config.settings.url, this.config.settings.options);
    }

    public addToMap(): void {
        this.source.addToMap(this.map, get(this.visible));
    }

    public removeFromMap(): void {
        this.source?.hide();
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