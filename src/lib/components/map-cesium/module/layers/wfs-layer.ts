import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";

import { WFSProviderCesium } from "../providers/wfs-provider";
import { CesiumLayer } from "./cesium-layer";
import { get } from "svelte/store";


export class WfsLayer extends CesiumLayer<WFSProviderCesium> {

	constructor(map: Map, config: LayerConfig) {
        super(map, config);
        this.source = new WFSProviderCesium(this.config.settings.url, this.config.settings.options);
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