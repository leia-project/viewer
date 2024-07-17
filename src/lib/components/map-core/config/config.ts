import { Dispatcher } from "../event/dispatcher";
import { LayerConfig } from "../layer-config";
import { LayerConfigGroup } from "../layer-config-group";
import { convertGeoadminDocument } from "./gm-config";
import { ConfigSettings } from "$lib/app/config-settings";

export class Config extends Dispatcher {
    public name: string;
    public viewer: any;
    public layerConfigs: Array<LayerConfig>; // flat
    public layerConfigGroups: Array<LayerConfigGroup>; //flat
    public tools: any;

    constructor() {
        super();
    }

    public async loadFromUrl(url: string): Promise<any> {        
        const document = await this.getDocument(url)
        this.loadFromDocument(document);
    }

    public loadFromDocument(document: any): any {
        this.name = document.name;
        this.viewer = document.viewer;
        this.layerConfigs = this.createLayerConfigs(document.layers);
        this.layerConfigGroups = this.createLayerConfigGroups(document.groups);
        this.tools = document.tools;
    }

    private createLayerConfigs(layersConfigs: any): Array<LayerConfig> {
        const configs = new Array<LayerConfig>();

        for(let i = 0; i < layersConfigs.length; i++) {
            const c = layersConfigs[i];
            const layerConfig = new LayerConfig({
                id: c.id,
                type: c.type,
                title: c.title,
                description: c.description,
                groupId: c.groupId,
                imageUrl: c.imageUrl,
                legendUrl: c.legendUrl,
                isBackground: c.isBackground,
                defaultAddToManager: c.defaultAddToManager,
                defaultOn: c.defaultOn,
                attribution: c.attribution,
                metadata: c.metadata,
                transparent: c.transparent,
                opacity: c.opacity,
                cameraPosition: c.cameraPosition,
                settings: c.settings
            })

            configs.push(layerConfig);
        }

        return configs;
    }

    private createLayerConfigGroups(layerConfigGroups: any): Array<LayerConfigGroup> {
        const groups = new Array<LayerConfigGroup>();
        
        for(let i = 0; i < layerConfigGroups.length; i++) {
            const config = layerConfigGroups[i];
            const group = new LayerConfigGroup(config.id, config.title, config.parentId);
            groups.push(group);
        }

        return groups;
    }

    private async getDocument(url: string): Promise<any> {   
        this.dispatch("loading", true);     
        const response = await fetch(url);
        const document = await response.json();
        this.dispatch("loading", false);

        return document;
    }
}