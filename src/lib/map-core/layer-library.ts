import { get, type Unsubscriber, writable } from "svelte/store";
import { LayerConfigGroup } from "./layer-config-group";
import { LayerConfig } from "./layer-config";
import { Dispatcher } from "./event/dispatcher";

import type { Writable } from "svelte/store";

export class LayerLibrary extends Dispatcher {
    private groupNoCategory: LayerConfigGroup;
    private groupBackgroundLayers: LayerConfigGroup;
    private unsubscribers: Record<string, Unsubscriber>;
    private parentNotFoundGroup: Array<LayerConfigGroup>;
    
    public groups: Writable<Array<LayerConfigGroup>>;
    public selectedLayerConfig: Writable<LayerConfig>;
    public tags: Writable<Array<string>>;

    constructor() {
        super();
        this.unsubscribers = {};
        this.parentNotFoundGroup = new Array<LayerConfigGroup>();
        this.selectedLayerConfig = writable<LayerConfig>(undefined);
        this.groupNoCategory = new LayerConfigGroup("group_uncategorised", "No Category");
        this.groupBackgroundLayers = new LayerConfigGroup("group_background", "Background");
        this.groups = writable<Array<LayerConfigGroup>>(new Array<LayerConfigGroup>());
        this.tags = writable<Array<string>>([]);

        this.addLayerConfigGroup(this.groupBackgroundLayers);
        this.addLayerConfigGroup(this.groupNoCategory);
    }

    public findLayer(layerId: string): LayerConfig | undefined {
        return this.findLayerRecursive(layerId, get(this.groups));
    }

    private findLayerRecursive(layerId: string, groups: Array<LayerConfigGroup>): LayerConfig | undefined {
        for(let i = 0; i < groups.length; i++) {
            const layerConfigs = get(groups[i].layerConfigs);
            if(layerConfigs.length > 0) {
                for(let j = 0; j < layerConfigs.length; j++) {
                    if(layerConfigs[j].id === layerId) {
                        return layerConfigs[j];
                    }
                }
            }

            const childGroups = get(groups[i].childGroups);
            if(childGroups.length > 0) {
                const rec = this.findLayerRecursive(layerId, get(groups[i].childGroups));
                if(rec) {
                    return rec;
                }
            }
        }

        return undefined;
    }

    public findGroup(groupId: string | undefined): LayerConfigGroup | undefined {
        if(!groupId) {
            return undefined;
        }

        return this.findGroupRecursive(get(this.groups), groupId);
    }

    private findGroupRecursive(groups: Array<LayerConfigGroup>, groupId: string | undefined): LayerConfigGroup | undefined {
        const result = groups.find(g => g.id === groupId);

        if(result) {
            return result;
        }

        for(let i = 0; i < groups.length; i++) {
            const childGroups = get(groups[i].childGroups);
            if(childGroups.length > 0) {
                const rec = this.findGroupRecursive(get(groups[i].childGroups), groupId);
                if(rec) {
                    return rec;
                }
            }
        }

        return undefined
    }

    public addLayerConfigGroup(group: LayerConfigGroup): void {
        const layerConfigs = get(group.layerConfigs);

        if(layerConfigs && layerConfigs.length > 0) {
            for(let i = 0; i < layerConfigs.length; i++) {
                this.subscribeLayerConfig(layerConfigs[i]);
            }
        }                

        if(group.parentId) {
            const children = this.parentNotFoundGroup.filter((p) => { return p.parentId === group.parentId });
            
            if(children) {
                for(let i = 0; i < children.length; i++) {
                    group.addGroup(children[i]);
                }

                this.parentNotFoundGroup = this.parentNotFoundGroup.filter((p) => { return p.parentId !== group.parentId });;
            }

            const parent = this.findGroup(group.parentId);
            if(parent) {
                parent.addGroup(group);
            } else {
                this.parentNotFoundGroup.push(group);
            }
        } else {
            this.groups.set([...get(this.groups), group]);
        }
    }

    public addLayerConfigGroups(groups: Array<LayerConfigGroup>): void {
        for(let i = 0; i < groups.length; i++) {
            this.addLayerConfigGroup(groups[i]);
        }
    }

    public addLayerConfigs(configs: Array<LayerConfig>): void {
        for(let i = 0; i < configs.length; i++) {
            const config = configs[i];
            this.addLayerConfig(config);
        }
    }

    public addLayerConfig(config: LayerConfig): void {
        let group = this.findGroup(config.groupId);

        if(!group && config.isBackground) {
            group = this.groupBackgroundLayers;
        }
        
        if(!group) {
            group = this.groupNoCategory;
        }

        group.addLayerConfig(config);
        this.subscribeLayerConfig(config);

        
        let layerTags: string[] = config.tags;
        if (layerTags) {
            for (let x=0; x<layerTags.length; x++) {
                let layerTag: string = layerTags[x];
                let currenTags: string[] = get(this.tags);
                if (currenTags.includes(layerTag) === false) {
                    this.tags.set([...currenTags, layerTag]);
                }
            }
        }
    }

    public removeLayerConfig(config: LayerConfig): void {
        this.dispatch("layerRemoved", config);
        const group = this.findGroup(config.groupId);
        if (group) group.removeLayerConfig(config);
        if (config.id) {
            this.unsubscribers[config.id]();
            delete this.unsubscribers[config.id];
        }
    }

    private subscribeLayerConfig(config: LayerConfig): void {
        const unsubscribe = config.added.subscribe((added) => {
            if(!config.ready) {
                return;
            }

            if(added) {
                this.dispatch("layerAdded", config);
            } else {
                this.dispatch("layerRemoved", config);
            }
        })

        this.unsubscribers[config.id] = unsubscribe;
        config.ready = true;

        if(config.defaultAddToManager === true) {
            config.added.set(true);
        }
    }
}