import { Layer } from "$lib/components/map-core/layer";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { writable, get, type Writable } from "svelte/store";

import type { Map } from "../map";

export abstract class CesiumLayer<T> extends Layer {
	public map: Map;

	private _source: Writable<T>;

	constructor(map: Map, config: LayerConfig) {
		super(config, config.defaultOn);
		this.map = map;
		this._source = writable<T>(undefined);
		this._source.subscribe((source) => {			
			if (source !== undefined) {
				this.addToMap();
			}
		});
	}

	public get source(): T {
		return get(this._source);
	}

	public set source(newSource: T) {
		newSource["config_id"] = this.config.id;
		newSource["title"] = this.config.title;
		this._source.set(newSource);
	}

	protected getSourceIndex(): number {
		for (let i = 0; i < this.map.viewer.imageryLayers.length; i++) {
			const p = this.map.viewer.imageryLayers.get(i);
			if (p["config_id"] && p["config_id"] === this.config.id) {
				return i;
			}
		}

		return -1;
	}

	protected getPrimitiveIndex(): number {
		for (let i = 0; i < this.map.viewer.scene.primitives.length; i++) {
			const p = this.map.viewer.scene.primitives.get(i);
			if (p["config_id"] && p["config_id"] === this.config.id) {
				return i;
			}
		}

		return -1;
	}

	public abstract addToMap(): void;
	public abstract removeFromMap(): void;
}
