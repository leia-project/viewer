import { _ } from "svelte-i18n";
import { get, writable, type Writable } from "svelte/store";
import { MyLocationLayer } from "../map-layers/my-location-layer";

/* import type { GeocoderLayer } from "../map-layers/geocoder-layer"; */
import type { QALayer } from "../map-layers/qa-layer";
import type { InputLayer } from "../map-layers/input-layer";

export class LayerManager {

	public qaLayers: Writable<Array<QALayer>> = writable([]);
	public inputLayers: Writable<Array<InputLayer>> = writable([]);
	public myLocationLayer: Writable<MyLocationLayer | undefined> = writable(undefined);
	/* public geocoderLayer: Writable<GeocoderLayer | undefined> = writable(undefined);*/

	constructor() {}

	public setup(): void {
		/* app.userLocationManager.locationWritable.subscribe((location) => {
			if (location) {
				if (!this.myLocationLayer) {
					const myLocationLayer = new MyLocationLayer(app.getMap(), location);
					this.addMyLocationLayer(myLocationLayer);
				}
			}
		}); */
	}

	/* 
	public async setGeocoderLayer(layer: GeocoderLayer): Promise<void> {
		await this.removeGeocoderLayer();
		this.geocoderLayer = layer;
	}

	public async removeGeocoderLayer(): Promise<void> {
		const geocoderLayer = get(this.geocoderLayer);
		if (geocoderLayer) {
			geocoderLayer.delete();
		}
		this.geocoderLayer.set(undefined);
	} 
	*/

	private addMyLocationLayer(layer: MyLocationLayer): void {
		this.myLocationLayer.set(layer);
	}

	public addQALayer(layer: QALayer): void {
		this.qaLayers.update((layers: any) => [...layers, layer]);
	}

	public addInputLayer(layer: InputLayer): void {
		this.inputLayers.update((layers: any) => [...layers, layer]);
	}

	public removeQALayer(id: string): void {
		const layer = get(this.qaLayers).find((layer: any) => layer.id === id);
		if (layer) {
			layer.delete();
		}

		this.qaLayers.update((layers: any) => layers.filter((layer: any) => layer.id !== id));
	}

	public removeInputLayer(id: string): void {
		const layer = get(this.inputLayers).find((layer: any) => layer.id === id);
		if (layer) {
			layer.delete();
		}

		this.inputLayers.update((layers: any) => layers.filter((layer: any) => layer.id !== id));
	}

	public hideAllLayers(): void {
		get(this.qaLayers).forEach((layer) => {
			layer.visible.set(false);
		});
		get(this.inputLayers).forEach((layer) => {
			layer.visible.set(false);
		});
	}

	public showAllLayers(): void {
		get(this.qaLayers).forEach((layer) => {
			layer.visible.set(true);
		});
		get(this.inputLayers).forEach((layer) => {
			layer.visible.set(true);
		});
	}

	public getLayersForGeomInput(): Array<{ name: string; id: string; data: any }> {
		const data = new Array<{ name: string; id: string; data: any }>();

		// add my location layer
	/* 	if (this.myLocationLayer) {
			data.push({ name: get(_)("layers.myLocationLayer"), id: this.myLocationLayer.id, data: this.myLocationLayer.data });
		}

		if (this.geocoderLayer) {
			data.push({ name: this.geocoderLayer.name, id: this.geocoderLayer.id, data: this.geocoderLayer.data });
		} */

		// add qa layers
		get(this.qaLayers).forEach((layer) => {
			data.push({ name: layer.name, id: layer.id, data: layer.data });
		});

		// add input layers
		get(this.inputLayers).forEach((layer) => {
			// only add if data is unique in the list
			if (!data.some((d) => d.data === layer.data)) {
				data.push({ name: layer.name, id: layer.id, data: layer.data });
			}
		});

		return data;
	}
}
