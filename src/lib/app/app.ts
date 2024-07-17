import { Map } from "$lib/components/map-cesium/module/map";
import { writable } from 'svelte/store';

import type { Writable } from "svelte/store";
import type { ConfigSettings } from './config-settings';
import { get } from "svelte/store";

class App {
    public map!: Writable<Map | undefined>;
	public configSettings!: Writable<ConfigSettings>;

	constructor() {
		this.map = writable<Map | undefined>(undefined);
		this.configSettings = writable<ConfigSettings>(undefined);
	}

	public init() {
		this.loadMap();
	}

	public loadMap(reload: boolean = false): void {
        this.map.set(new Map(reload));
	}
}

export const app = new App();
