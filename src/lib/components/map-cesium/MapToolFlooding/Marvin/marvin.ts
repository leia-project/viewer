import { type Writable, writable } from "svelte/store";
import type { Map } from "$lib/components/map-cesium/module/map";

import { QAManager } from "./module/managers/qa-manager";
import { GeomInputManager } from "./module/managers/geom-input-manager"
import { UserLocationManager } from "./module/managers/user-location-manager"
import { LayerManager } from "./module/managers/layer-manager"
import MarvinMenu from "./MarvinMenu.svelte";
// import { CommandPalette } from "module/command-center/command-palette.svelte";


export class MarvinApp {
	public map: Map;
	public menu?: MarvinMenu;

	public ready: Writable<boolean>;
	public qaManager: QAManager;
	public geomInputManager: GeomInputManager;
	public userLocationManager: UserLocationManager;
	public layerManager: LayerManager;
	//public commandPalette!: CommandPalette;

	constructor(map: Map) {
		this.map = map;
		this.ready = writable(false);
		this.qaManager = new QAManager();
		this.geomInputManager = new GeomInputManager();
		this.userLocationManager = new UserLocationManager();
		this.layerManager = new LayerManager();
		//this.commandPalette = new CommandPalette();
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
