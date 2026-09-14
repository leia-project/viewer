import { writable, get, type Writable } from "svelte/store";
import { Layer } from "$lib/map-core/layer";
import type { LayerConfig } from "$lib/map-core/layer-config";

import type { Map } from "../map";

export abstract class CesiumLayer<T> extends Layer {
	public map: Map;

	private _source: Writable<T>;
	protected loadInitiated = false;
	private _loadPromise: Promise<void> | undefined;

	constructor(map: Map, config: LayerConfig) {
		super(config, config.defaultOn);
		this.map = map;
		this._source = writable<T>(undefined);
		this._source.subscribe((source) => {			
			if (source !== undefined) {
				this.addToMap();
			}
		});

		this.visible.subscribe((visible) => {
			if (visible) {
				void this.ensureLoaded();
			}
		});
	}

	/**
	 * Hook for concrete layers to create their source / start fetching data.
	 * Called once, the first time the layer becomes visible (or when a tool calls
	 * ensureLoaded()). Layers that do not override this keep their previous
	 * (eager, constructor-time) loading behaviour.
	 */
	protected startLoading(): void | Promise<void> {}

	/**
	 * Ensures the layer's data is loaded exactly once, without requiring the layer
	 * to be visible. Tools that need a layer's source/data before the user toggles
	 * it on (e.g. the isochrones and flooding tools) should await this. Subsequent
	 * calls return the same promise and never trigger a reload.
	 */
	public ensureLoaded(): Promise<void> {
		if (!this.loadInitiated) {
			this.loadInitiated = true;
			this._loadPromise = Promise.resolve(this.startLoading());
		}
		return this._loadPromise ?? Promise.resolve();
	}

	public get source(): T {
		return get(this._source);
	}

	public set source(newSource: T) {
		newSource["config_id"] = this.config.id;
		newSource["title"] = this.config.title;
		newSource["type"] = this.config.type;
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
