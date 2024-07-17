import { get, writable, type Unsubscriber } from "svelte/store";

import type { Writable } from "svelte/store";
import type { LayerConfig } from "./layer-config";

export class LayerConfigGroup {
    public id: string;
    public title: string;
    public parentId: string | undefined;
    public childGroups: Writable<Array<LayerConfigGroup>>;
    public layerConfigs: Writable<Array<LayerConfig>>;
    public open: Writable<boolean>;
    public totalLayerCount: Writable<number>;
    public enabledLayerCount: Writable<number>;

    private groupTotalLayerCountUnsubscribers: Record<string, Unsubscriber>;
    private groupEnabledLayerCountUnsubscribers: Record<string, Unsubscriber>;
    private layerUnsubscribers: Record<string, Unsubscriber>;    

    constructor(id: string, title: string, parentId: string | undefined = undefined, childGroups: Array<LayerConfigGroup> = new Array<LayerConfigGroup>()) {
        this.id = id;
        this.title = title;
        this.parentId = parentId;
        this.groupTotalLayerCountUnsubscribers = {};
        this.groupEnabledLayerCountUnsubscribers = {};
        this.layerUnsubscribers = {};
        this.childGroups = writable<Array<LayerConfigGroup>>(new Array<LayerConfigGroup>());
        this.layerConfigs = writable<Array<LayerConfig>>(new Array<LayerConfig>());
        this.open = writable<boolean>(false);
        this.totalLayerCount = writable<number>(0);
        this.enabledLayerCount = writable<number>(0);

        for(let i = 0; i < childGroups.length; i++) {
            this.addGroup(childGroups[i]);
        }
    }

    public addGroup(group: LayerConfigGroup): void {
        const unsubscribeTotal = group.totalLayerCount.subscribe((a) => {
            this.calculateTotalAndEnabledLayers();
        });

        const unsubscribeEnabled = group.enabledLayerCount.subscribe((a) => {
            this.calculateTotalAndEnabledLayers();
        });

        this.groupTotalLayerCountUnsubscribers[group.id] = unsubscribeTotal;
        this.groupEnabledLayerCountUnsubscribers[group.id] = unsubscribeEnabled;
        this.childGroups.set([...get(this.childGroups), group]);

        this.calculateTotalAndEnabledLayers();
    }

    public addLayerConfig(config: LayerConfig): void {
        const layerConfigs = get(this.layerConfigs);
        const filtered = layerConfigs.filter((l) => { return l.id === config.id});
    
        // layer already added to group
        if(filtered && filtered.length > 0) {
            console.info("layer already added to group (" + config.title + ")");
            return;
        }

        const unsubscribe = config.added.subscribe((a) => {
            this.calculateTotalAndEnabledLayers();
        });

        this.layerUnsubscribers[config.id] = unsubscribe;
        this.layerConfigs.set([...get(this.layerConfigs), config]);

        this.calculateTotalAndEnabledLayers();
    }

    public removeLayerConfig(config: LayerConfig): void {
        const layerConfigs = get(this.layerConfigs);
        const index = layerConfigs.indexOf(config);
        if (index < 0) return;

        this.layerUnsubscribers[config.id]();
        delete this.layerUnsubscribers[config.id];

        layerConfigs.splice(index, 1);
        this.layerConfigs.set(layerConfigs);

        this.calculateTotalAndEnabledLayers();
    }

    public addAllLayers(): void {
        const layers = get(this.layerConfigs);
        const childGroups = get(this.childGroups);

        for(let i = 0; i < layers.length; i++) {
            layers[i].add();
        }

        if(childGroups && childGroups.length > 0) {
            for(let i = 0; i < childGroups.length; i++) {
                childGroups[i].addAllLayers();
            }
        }
    }

    public removeAllLayers(): void {
        const layers = get(this.layerConfigs);
        const childGroups = get(this.childGroups);

        for(let i = 0; i < layers.length; i++) {
            layers[i].remove();
        }

        if(childGroups && childGroups.length > 0) {
            for(let i = 0; i < childGroups.length; i++) {
                childGroups[i].removeAllLayers();
            }
        }
    }

    private calculateTotalAndEnabledLayers(): void {
        const groups = get(this.childGroups);
        const layers = get(this.layerConfigs);

        const totalFromGroups = groups.map((g) => get(g.totalLayerCount)).reduce((a, b) => a + b, 0);
        const enabledFromGroups = groups.map((g) => get(g.enabledLayerCount)).reduce((a, b) => a + b, 0);
    
        this.totalLayerCount.set(totalFromGroups + layers.length);
        this.enabledLayerCount.set(enabledFromGroups + layers.filter((l) => get(l.added)).length);
    }
}