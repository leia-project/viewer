import { get, writable, type Unsubscriber } from "svelte/store";

import type { Writable } from "svelte/store";
import type { Layer } from "./layer";

export class LayerManagerGroup {
    public id: string;
    public title: string;
    public parentId: string | undefined;
    public childGroups: Writable<Array<LayerManagerGroup>>;
    public layers: Writable<Array<Layer>>;
    public open: Writable<boolean>;
    public totalLayerCount: Writable<number>;
    public visibleLayerCount: Writable<number>;

    private groupTotalLayerCountUnsubscribers: Record<string, Unsubscriber>;
    private groupEnabledLayerCountUnsubscribers: Record<string, Unsubscriber>;
    private layerUnsubscribers: Record<string, Unsubscriber>;    

    constructor(id: string, title: string, parentId: string | undefined = undefined, childGroups: Array<LayerManagerGroup> = new Array<LayerManagerGroup>()) {
        this.id = id;
        this.title = title;
        this.parentId = parentId;
        this.groupTotalLayerCountUnsubscribers = {};
        this.groupEnabledLayerCountUnsubscribers = {};
        this.layerUnsubscribers = {};
        this.childGroups = writable<Array<LayerManagerGroup>>(new Array<LayerManagerGroup>());
        this.layers = writable<Array<Layer>>(new Array<Layer>());
        this.open = writable<boolean>(false);
        this.totalLayerCount = writable<number>(0);
        this.visibleLayerCount = writable<number>(0);

        for(let i = 0; i < childGroups.length; i++) {
            this.addGroup(childGroups[i]);
        }
    }

    public addGroup(group: LayerManagerGroup): void {
        const unsubscribeTotal = group.totalLayerCount.subscribe((a) => {
            this.calculateTotalAndEnabledLayers();
        });

        const unsubscribeEnabled = group.visibleLayerCount.subscribe((a) => {
            this.calculateTotalAndEnabledLayers();
        });

        this.groupTotalLayerCountUnsubscribers[group.id] = unsubscribeTotal;
        this.groupEnabledLayerCountUnsubscribers[group.id] = unsubscribeEnabled;
        this.childGroups.set([...get(this.childGroups), group]);

        this.calculateTotalAndEnabledLayers();
    }

    public addLayer(layer: Layer): void {
        const layers = get(this.layers);
        const filtered = layers.filter((l) => { return l.id === layer.config.id});
    
        // layer already added to group
        if(filtered && filtered.length > 0) {
            console.info("layer already added to group");
            return;
        }

        const unsubscribe = layer.visible.subscribe((a) => {
            this.calculateTotalAndEnabledLayers();
        });

        this.layerUnsubscribers[layer.config.id] = unsubscribe;
        this.layers.set([...get(this.layers), layer]);

        this.calculateTotalAndEnabledLayers();
    }

    public removeLayer(layer: Layer): void {
        const layers = get(this.layers);
        const index = layers.indexOf(layer);
        if (index < 0) return;

        this.layerUnsubscribers[layer.config.id]();
        delete this.layerUnsubscribers[layer.config.id];

        layers.splice(index, 1);
        this.layers.set(layers);

        this.calculateTotalAndEnabledLayers();
    }

    public showAllLayers(): void {
        const layers = get(this.layers);
        const childGroups = get(this.childGroups);

        for(let i = 0; i < layers.length; i++) {
            layers[i].visible.set(true);
        }

        if(childGroups && childGroups.length > 0) {
            for(let i = 0; i < childGroups.length; i++) {
                childGroups[i].showAllLayers();
            }
        }
    }

    public hideAllLayers(): void {
        const layers = get(this.layers);
        const childGroups = get(this.childGroups);

        for(let i = 0; i < layers.length; i++) {
            layers[i].visible.set(false);
        }

        if(childGroups && childGroups.length > 0) {
            for(let i = 0; i < childGroups.length; i++) {
                childGroups[i].hideAllLayers();
            }
        }
    }

    private calculateTotalAndEnabledLayers(): void {
        const groups = get(this.childGroups);
        const layers = get(this.layers);

        const totalFromGroups = groups.map((g) => get(g.totalLayerCount)).reduce((a, b) => a + b, 0);
        const visibleFromGroups = groups.map((g) => get(g.visibleLayerCount)).reduce((a, b) => a + b, 0);
    
        this.totalLayerCount.set(totalFromGroups + layers.length);
        this.visibleLayerCount.set(visibleFromGroups + layers.filter((l) => get(l.visible)).length);
    }
}