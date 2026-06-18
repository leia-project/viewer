import { type Writable, writable, get } from "svelte/store";
import { FeatureInfo } from "./feature-info/feature-info";
import { Layer } from "./layer";
import { CameraLocation } from "./camera-location";
import { FeatureInfoResults } from "./feature-info/feature-info-results";
import { FeatureInfoRequestOptions } from "./feature-info/feature-info-request-options";
import { Dispatcher } from "./event/dispatcher";
import { MouseLocation } from "./mouse-location";
import { Location } from "./location";
import { Config } from "./config/config";
import { LayerLibrary } from "./layer-library";
import { notifications } from "./notifications/notifications";

import type { LayerConfig } from "./layer-config";
import type { LayerConfigGroup } from "./layer-config-group";
import { Notification } from "./notifications/notification";
import { NotificationType } from "./notifications/notification-type";

export abstract class MapCore extends Dispatcher {
	public readonly layerLibrary: LayerLibrary;
	public readonly layers: Writable<Array<Layer>>;
	public readonly featureInfo: FeatureInfoResults;
	public readonly configLoaded: Writable<boolean>;
	public readonly ready: Writable<boolean>;

	public startPosition?: CameraLocation;
	public toolSettings: any;
	public viewerSettings: any;
	public autoCheckBackground: boolean = true;
	public container!: HTMLElement;

	public config: Config;
	public configured: boolean | undefined = undefined;

	constructor() {
		super();
		
		this.configLoaded = writable<boolean>(false);
		this.config = new Config();
		this.layerLibrary = new LayerLibrary();
		this.ready = writable(false);
		this.layers = writable<Array<Layer>>(new Array<Layer>());
		this.featureInfo = new FeatureInfoResults();

		this.layerLibrary.on("layerAdded", (l: LayerConfig) => {
			this.addLayerInternal(l);
		});

		this.layerLibrary.on("layerRemoved", (l: LayerConfig) => {
			this.removeLayerInternal(l);
		});

		this.ready.subscribe(r => {
			if(r) {
				this.subscribeToEvents();
			}
		})
	}

	public setLayerConfig(layers: Array<LayerConfig>, groups: Array<LayerConfigGroup>): void {		
		this.layerLibrary.addLayerConfigGroups(groups);
		this.layerLibrary.addLayerConfigs(layers);
	}

	public async setConfig(url: string): Promise<void> {
		this.configured = true;
		await this.config.loadFromUrl(url).then(()=> {
			if (!this.viewerSettings) {
				this.setLayerConfig(this.config.layerConfigs, this.config.layerConfigGroups);
	
				this.toolSettings = this.config.tools;
				this.viewerSettings = this.config.viewer;
				if (this.config.viewer && this.config.viewer.startPosition) {
					const p = this.config.viewer.startPosition;
					this.config.viewer.startCameraMode3D = this.config.viewer.startCameraMode3D ?? true;
					if (!this.config.viewer.startCameraMode3D) p.pitch = -89.9;
					
					this.startPosition = new CameraLocation(p.x, p.y, p.z, p.heading, p.pitch, p.duration);
				}
				this.configLoaded.set(true);
			}
		});
	}

	/**
	 * Add a layer config which can be added to the map
	 */
	private addLayerInternal(layerConfig: LayerConfig): void {
		const backgroundLayer = this.getActiveBackground();
		if (
			layerConfig.isBackground === true &&
			layerConfig.defaultOn === true &&
			backgroundLayer !== undefined
		) {
			layerConfig.defaultOn = false;
		}

		try {
			const layer = this.addLayer(layerConfig);
			this.layers.set([...get(this.layers), layer]);
		} catch (error) {
			const notification = new Notification(NotificationType.ERROR, "Error", `Unable to add layer ${layerConfig.title}, see log for more information`, 5000, true, true);
			notification.error = error;
			notifications.send(notification);
			layerConfig.added.set(false);
		}		
	}

	/**
	 * Remove a layer config, remove it from the map aswell
	 */
	private removeLayerInternal(layerConfig: LayerConfig): void {
		const index = this.getLayerIndexById(layerConfig.id);
		if (index === -1) {
			console.info(`Remove layer: Layer with id: ${layerConfig.id} not found in layers`);
			return;
		}

		const layer = this.getLayerById(layerConfig.id);
		if (layer) {
			this.removeLayer(layer);
		}

		get(this.layers).splice(index, 1);
		this.layers.set([...get(this.layers)]);

		if (this.autoCheckBackground) {
			this.trySetBackgroundActive();
		}
	}

	/**
	 * If there is no backround layer active try to find the first one and active it
	 */
	private trySetBackgroundActive() {
		const active = this.getActiveBackground();
		if (active === undefined) {
			const layers = get(this.layers);

			for (let i = 0; i < layers.length; i++) {
				const layer = layers[i];
				if (layer.config.isBackground === true) {
					layer.visible.set(true);
					return;
				}
			}
		}
	}

	public subscribeToEvents() {
		this.subscribeMouseMove((m: MouseLocation) => {this.dispatch("mouseMove", m)});
		this.subscribeMouseLeftClick((m: MouseLocation) => {this.dispatch("mouseLeftClick", m)});
		this.subscribeMouseRightClick((m: MouseLocation) => {this.dispatch("mouseRightClick", m)});
	}

	/**
	 * Get current active background layer
	 * @returns Active background layer if found, undefined if not found
	 */
	public getActiveBackground(): Layer | undefined {
		const layers = get(this.layers);

		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];
			if (layer.config.isBackground === true && get(layer.visible) === true) {
				return layer;
			}
		}

		return undefined;
	}

	/**
	 * Get layer by given id
	 * @param id id of the layer
	 * @returns Layer for given id if found
	 */
	public getLayerById(id: string): Layer | undefined {
		const layers = get(this.layers);
		return layers.find((l) => l.config.id === id);
	}

	/**
	 * Get layer by layer title
	 * @param title title of the layer
	 * @returns Layer for given title if found
	 */
	public getLayerByTitle(title: string): Layer | undefined {
		const layers = get(this.layers);
		return layers.find((l) => l.config.title === title);
	}

	/**
	 * Get index of a layer
	 * @param id id of the layer
	 * @returns index for the given layer id, -1 if not found
	 */
	public getLayerIndexById(id: string): number {
		const layers = get(this.layers);
		return layers.findIndex((l) => l.config.id.toString() === id.toString());
	}

	/**
	 * Set the map to it's home position
	 */
	public home(): void {
		if (!this.startPosition) {
			throw new Error("No home position found");
		}

		this.flyTo(this.startPosition);
	}

	/**
	 * Try to get feature info for a location
	 * @param options FeatureInfoRequestOptions
	 */
	public async getFeatureInfo(options: FeatureInfoRequestOptions): Promise<Array<FeatureInfo>> {
		this.featureInfo.loading.set(true);
		let fi = Array<FeatureInfo>();

		try {
			fi = await this.queryFeatureInfo(options);
			this.featureInfo.results.set(fi);
			this.featureInfo.loading.set(false);
			return fi;
		} catch (e: any) {
			this.featureInfo.loading.set(false);
			throw e;
		}
	}

	/**
	 * Zoom to a position, duration is always set to 0 to skip fly
	 * @param position position to zoom to
	 */
	public zoomTo(position: CameraLocation) {
		position.duration = 0;
		this.flyTo(position);
	}

	/**
	 * When fully loaded and ready to use the map set the map ready using
	 * this.ready.set(true);
	 */
	 protected setReady(): void {
		this.ready.set(true);
	}

	/**
	 * Get the current camera or map position
	 * @returns position
	 */
	public abstract getPosition(): CameraLocation;

	/**
	 * Fly the camera to the given position
	 * @param position
	 */
	public abstract flyTo(position: CameraLocation): void;

	/**
	 * Zoom one step in on the map
	 */
	public abstract zoomIn(): void;

	/**
	 * Zoom one step out on the map
	 */
	public abstract zoomOut(): void;

	/**
	 * Reset the north position of the camera to 0
	 */
	public abstract resetNorth(): void;

	/**
	 * Add a layer to the map using a LayerConfig describing the layer
	 * @param config
	 */
	public abstract addLayer(config: LayerConfig): Layer;

	/**
	 * Remove a layer from the map
	 * @param layer The layer to remove
	 */
	public abstract removeLayer(layer: Layer): void;

	/**
	 * Get Longitude and Latitude for x,y mouse position
	 * @param location MouseLocation on the map
	 */
	public abstract screenToLonLat(location: MouseLocation): Location;

	/**
	 * Get the container of the map
	 */
	public abstract getContainer(): HTMLElement;

	/**
	 * Get feature info for a given location
	 * @param options FeatureInfoRequestOptions
	 */
	protected abstract queryFeatureInfo(
		options: FeatureInfoRequestOptions
	): Promise<Array<FeatureInfo>>;


	protected abstract subscribeMouseMove(trigger: (m: MouseLocation) => void): void;
	protected abstract subscribeMouseLeftClick(trigger: (m: MouseLocation) => void): void;
	protected abstract subscribeMouseRightClick(trigger: (m: MouseLocation) => void): void;
}
