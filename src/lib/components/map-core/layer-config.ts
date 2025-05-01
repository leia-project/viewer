import { writable } from "svelte/store";

import type { Writable } from "svelte/store";
import { CameraLocation } from "./camera-location";

export class LayerConfig {
    public id!: string;
    public type!: string;
    public title!: string;
    public description!: string;
    public groupId!: string;
    public imageUrl!: string;
    public legendUrl!: string;
    public isBackground: boolean = false;
    public defaultAddToManager: boolean = false;
    public defaultOn: boolean = false;
    public attribution!: string;
    public metadata!: Array<{ key: string, value: string }>;
    public metadataUrl!: string;
    public metadataLink: string;
    public transparent: boolean = false;
    public opacity!: number;
    public settings!: any;
    public cameraPosition: CameraLocation;
    public tags: Array<string>

    public added: Writable<boolean>;

    // ready is set to true after adding and subscribing in the layer-library, this is used to not trigger an update after subscribing
    public ready = false;

    constructor(init?: Partial<LayerConfig>) {
        Object.assign(this, init);
        this.added = writable<boolean>(false);
    }

    get legendSupported(): boolean {
        return this.legendUrl ? true : false;
    }

    get opacitySupported(): boolean {
        return this.transparent;
    }

    public add(): void {
        this.added.set(true);
    }

    public remove(): void {
        this.added.set(false);
    }
}
