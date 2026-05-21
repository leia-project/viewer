import { Map } from "$lib/components/map-cesium/module/map";
import { writable, type Writable } from 'svelte/store';
import type { ConfigSettings } from './config-settings';


class App {
    public map: Writable<Map | undefined>;
	public configSettings: Writable<ConfigSettings | undefined>;

	constructor() {
		this.map = writable(undefined);
		this.configSettings = writable(undefined);
	}

	public init() {
		this.loadMap();
	}

	public loadMap(reload: boolean = false): void {
        this.map.set(new Map(reload));
	}
}

export const app = new App();
