import { get, writable, type Writable } from "svelte/store";
import { MarvinClient } from "./client";
import { Result } from "./result";
//import { v4 as uuidv4 } from "uuid";
import { getLayerColor } from "./utils/layer-color";
import { QALayer } from "./map-layers/qa-layer";
import { InputLayer } from "./map-layers/input-layer";
import { wktToFeatureCollection } from "./utils/geo";
import type { MarvinApp } from "../marvin";


export class QA {
	private app: MarvinApp;
	public id: string;
	public question: string;
	public geom: string;
	public geomName: string;
	public loading: Writable<boolean> = writable(false);
	public result: Writable<Result | undefined> = writable(undefined);
	public error: Writable<string | undefined> = writable(undefined);
/* 	public summary: Writable<any> = writable(undefined);
	public datasetName: Writable<any> = writable(undefined);
	public hasGeometry: Writable<boolean> = writable(false);
	public error: Writable<string | undefined> = writable(undefined);
 */	public color: string;
	public resultLayer: Writable<QALayer | undefined> = writable(undefined);
	public inputLayer: InputLayer | undefined;

	constructor(app: MarvinApp, question: string, geom: string, geomName: string = "") {
		this.app = app;
		this.id = Math.random().toString(36).substring(7);
		this.color = getLayerColor();
		this.question = question;
		this.geom = geom;
		this.geomName = geomName;
	}

	public async askGeo(): Promise<any> {
		this.removeLayers();
		this.loading.set(true);
		this.error.set(undefined);

		try {
			const client = new MarvinClient(this.app.baseUrl);
			const response = await client.askGeo(this.question, this.geom, get(this.app.userLocationManager.location) ?? "");

			const result = Result.fromJSON(response);
			this.result.set(result);
			if (result.error) {
				console.error(result.error);
				this.error.set(result.error);
				this.loading.set(false);
				return;
			}

			this.createLayers(result);
			this.zoomToArea();
		} catch (e: any) {
			console.error(e);
			this.error.set(e.message);
		}

		this.loading.set(false);
	}

	private createLayers(result: Result): void {
		if (result.inputLocation && result.inputLocation.source) {
			const resultLayerName = result.inputLocation.source.join(", ");
			this.inputLayer = new InputLayer(this.app.map, this.id, "input", resultLayerName, this.color, result.inputLocation.getFeatureCollection());
			this.app.layerManager.addInputLayer(this.inputLayer);
		}

		if (this.geom) {
			const inputLayerName = this.geomName ? this.geomName : "Unknown";
			const featureCollection = wktToFeatureCollection(this.geom, inputLayerName);
			this.inputLayer = new InputLayer(this.app.map, this.id, "input", inputLayerName, this.color, featureCollection);
			this.app.layerManager.addInputLayer(this.inputLayer);
		}

		if (result.hasGeometry && result.features) {
			const resultLayer = new QALayer(this.app.map, this.id, "features", result.datasetName || "Unnamed", this.color, result.features.getFeatureCollection());
			this.app.layerManager.addQALayer(resultLayer);
			this.resultLayer.set(resultLayer);
		}
	}

	private zoomToArea() {
		if (this.inputLayer) {
			this.inputLayer?.zoomTo();
		} else if (get(this.result)?.hasGeometry) {
			get(this.resultLayer)?.zoomTo();
		}
	}

	public removeLayers(): void {
		const resultLayer = get(this.resultLayer);
		if (resultLayer) {
			this.app.layerManager.removeQALayer(resultLayer.id);
			this.resultLayer.set(undefined);
		}
		if (this.inputLayer) {
			this.app.layerManager.removeInputLayer(this.inputLayer.id);
			this.inputLayer = undefined;
		}
	}

	public showLayers(): void {
		get(this.resultLayer)?.visible.set(true);
		this.inputLayer?.visible.set(true);
	}

	public hideLayers(): void {
		get(this.resultLayer)?.visible.set(false);
		this.inputLayer?.visible.set(false);
	}
}
