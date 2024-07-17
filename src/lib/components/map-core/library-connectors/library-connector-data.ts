import { LayerConfig } from "../layer-config";
import { LayerConfigGroup } from "../layer-config-group";

export class LibraryConnectorData {
    groups: Array<LayerConfigGroup>;
    layerConfigs: Array<LayerConfig>;

    constructor(groups: Array<LayerConfigGroup> = new Array<LayerConfigGroup>(), layerConfigs: Array<LayerConfig> = new Array<LayerConfig>()) {
        this.groups = groups;
        this.layerConfigs = layerConfigs;
    }
}