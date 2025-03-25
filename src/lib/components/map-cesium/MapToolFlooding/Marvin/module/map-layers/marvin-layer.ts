import { writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { bbox } from "@turf/bbox";
import type { FeatureCollection } from "geojson";
import type { Map } from "$lib/components/map-cesium/module/map";
import { getColorRange } from "../utils/layer-color";
import { GeoJsonLayer } from "$lib/components/map-cesium/module/layers/geojson-layer";
import type { LayerConfig } from "$lib/components/map-core/layer-config";


export class MarvinLayer {

	public id: string;
	public name: string;
	public color: string;
	public data: FeatureCollection;
	public visible: Writable<boolean> = writable(true);
	private visibleUnsubscribe?: Unsubscriber = undefined;

	public map: Map;
	private geojsonLayer: GeoJsonLayer;

/* 	private mapLayers: any[] = [];
 */	
/* 
	protected paintPoint: any = undefined;
	protected paintLine: any = undefined;
	protected paintPolygonFill: any = undefined;
	protected paintPolygonOutline: any = undefined;
	protected paintLabel: any = undefined;

	protected polygonFill = true;
	protected polygonOutline = false; */


	constructor(id: string, name: string, color: string, map: Map, data: any) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.data = data;
		this.map = map;

		const layerConfig: Partial<LayerConfig> = {
			id: this.id,
			settings: {
				clampToGround: true,
			}
		}
		this.geojsonLayer = new GeoJsonLayer(map, layerConfig, data);
		this.visibleUnsubscribe = this.visible.subscribe((v) => v ? this.show() : this.hide())
	}


	public zoomTo() {
		this.geojsonLayer.zoomTo();
	}

	private show(): void {
		this.geojsonLayer.show();
	}

	private hide(): void {
		this.geojsonLayer.hide()
	}

	public delete(): void {
		this.geojsonLayer.remove();
		this.visibleUnsubscribe?.();
	}


	protected getColorCategories(): string[] | undefined {
		// check the first feature in data and see if there is a property which contains .category
		const feature = this.data.features[0];
		if (!feature?.properties) {
			return undefined;
		}

		const keys = Object.keys(feature.properties);
		const categories = keys.filter((key) => key.toLowerCase().includes(".category"));

		if (categories.length === 0) {
			return undefined;
		}

		return categories;
	}

	protected getCategoryUniqueValue(category: string): number[] {
		const values = new Set<number>();
		for (const feature of this.data.features) {
			const value = feature.properties?.[category];
			if (value) {
				values.add(value);
			}
		}

		return Array.from(values);
	}

	protected createColorMap(category: string): { value: number; color: string }[] {
		const values = this.getCategoryUniqueValue(category);
		const colorRange = getColorRange(this.color, values.length);

		return values.map((value, index) => {
			return {
				value,
				color: colorRange[index]
			};
		});
	}

	protected updatePolygonFill(fill: any, opacity: number | undefined) {
		/* this.map.setPaintProperty(`polygon-${this.id}`, "fill-color", fill);
		if (opacity) {
			this.map.setPaintProperty(`polygon-${this.id}`, "fill-opacity", opacity);
		} */
	}
}
