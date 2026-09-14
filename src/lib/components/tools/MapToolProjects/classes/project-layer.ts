import { get, writable, type Writable } from "svelte/store";
import type { Layer } from "$lib/map-core/layer";
import { LayerConfig } from "$lib/map-core/layer-config";
import { CesiumLayer } from "$lib/map-cesium/layers/cesium-layer";
import { ThreedeeLayer } from "$lib/map-cesium/layers/threedee-layer";
import type { Map } from "$lib/map-cesium/map";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from '@lukeed/uuid';


export class ProjectLayer {

	private map: Map;
	public id: string;
	private groupId?: string;
	public layer: Writable<Layer | undefined> = writable(undefined);
	public tilesetUrl?: string;

	private tempLayerConfig: LayerConfig | undefined;
	public tileset: Writable<Promise<Cesium.Cesium3DTileset> | undefined> = writable(undefined);
	public exists: Writable<boolean> = writable(false);
	public added: Writable<boolean> = writable(false);
	private _on: boolean = true;

	private abortController?: AbortController;

	constructor(map: Map, id: string, on: boolean, tilesetUrl?: string, groupId?: string) {
		this.map = map;
		this.id = id;
		this.groupId = groupId;
		this._on = on;
		this.tilesetUrl = tilesetUrl;
	}

	set on(on: boolean) {
		this._on = on;
		this.toggleVisibility();
	}

	get on(): boolean {
		return this._on;
	}

	public addToMap(): void {
		if (this.abortController) {
			this.abortController.abort();
		}
		this.abortController = new AbortController();
		const { signal } = this.abortController;

		new Promise<void>(async(resolve, reject) => {
			signal.addEventListener('abort', () => {
				reject();
			});
			let layerConfig: LayerConfig | undefined;
			if (this.tilesetUrl) {
				layerConfig = new LayerConfig({
					id: uuidv4(),
					groupId: this.groupId,
					title: this.id,
					type: "3dtiles",
					settings: {
						url: this.tilesetUrl,
						enableClipping: true
					}
				});
				this.map.layerLibrary.addLayerConfig(layerConfig);
				this.tempLayerConfig = layerConfig;
			} else {
				layerConfig = this.map.layerLibrary.findLayer(this.id)
			}
			if (layerConfig) {
				layerConfig.added.set(true);
				const layer = this.map.getLayerById(layerConfig.id);
				if (layer instanceof CesiumLayer) {
					this.exists.set(true);
					layer.visible.set(this.on ?? true);
					if (layer instanceof ThreedeeLayer) {
						layer.ensureLoaded().then(() => {
							if (layer.source) this.map.clipHandler.clip3DTileset(layer.source);
						});
					}
					this.layer.set(layer);
				}
			}
			resolve();
		}).then(() => {
			this.abortController = undefined;
		}).catch((error) => {
			console.error(error);
		});
	}

	public removeFromMap(): void {
		if (this.abortController) {
			this.abortController.abort();
		}
		get(this.layer)?.remove();
		if (this.tempLayerConfig) this.map.layerLibrary.removeLayerConfig(this.tempLayerConfig);
		/*const tileset = get(this.tileset);
		if (tileset) {
			tileset.then((t) => {
				this.map.viewer.scene.primitives.remove(t);
				if (!this.map.viewer.scene.primitives.destroyPrimitives) t.destroy();
			});
		}*/
		this.layer.set(undefined);
		this.tileset.set(undefined);
	}

	private toggleVisibility(): void {
		const layer = get(this.layer), tileset = get(this.tileset);
		if (layer) {
			layer.visible.set(this._on);
		}
		if (tileset) {
			tileset.then((tileset) => tileset.show = this._on);
		}
	}

	public flyTo(): void {
		const layer = get(this.layer), tileset = get(this.tileset);
		const pos = layer?.getLayerPosition();
		if (pos) this.map.flyTo(pos);
		else if (tileset) {
			tileset.then((t) => this.map.viewer.flyTo(t));
		}
	}

}
