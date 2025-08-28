import { type Writable, writable } from "svelte/store";
import type { Map } from "$lib/components/map-cesium/module/map";

import { QAManager } from "./module/managers/qa-manager";
import { GeomInputManager } from "./module/managers/geom-input-manager"
import { UserLocationManager } from "./module/managers/user-location-manager"
import { LayerManager } from "./module/managers/layer-manager"
import MarvinMenu from "./MarvinMenu.svelte";
import { CommandPalette } from "./module/command-center/command-palette";


export class MarvinApp {
	public map: Map;
	public baseUrl: string;
	public menu?: MarvinMenu;
	public openMenu: Writable<boolean> = writable(false);

	public ready: Writable<boolean>;
	public qaManager: QAManager;
	public geomInputManager: GeomInputManager;
	public userLocationManager: UserLocationManager;
	public layerManager: LayerManager;
	public commandPalette!: CommandPalette;

	public loading: Writable<boolean> = writable(false);

	constructor(map: Map, baseUrl: string = "https://marvin-server.bertha.geodan.nl") {
		this.map = map;
		this.baseUrl = baseUrl;
		this.ready = writable(false);
		this.qaManager = new QAManager(this.loading);
		this.geomInputManager = new GeomInputManager();
		this.userLocationManager = new UserLocationManager();
		this.layerManager = new LayerManager();
		this.commandPalette = new CommandPalette(this);
	}

	public init() {
		this.ready.set(true);
		this.userLocationManager.getLocation();
		this.layerManager.setup();
	}

	public mount(): void {
		this.menu?.$destroy();
		this.menu = new MarvinMenu({
			target: this.map.getContainer(),
			props: {
				app: this
			}
		})
	}

	public unmount(): void {
		this.menu?.$destroy();
	}
}
