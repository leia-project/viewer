import { writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { FeatureCollection } from "geojson";
import type { Map } from "$lib/components/map-cesium/module/map";
import { getColorRange } from "../utils/layer-color";
import { GeoJsonLayer } from "$lib/components/map-cesium/module/layers/geojson-layer";
import type { LayerConfig } from "$lib/components/map-core/layer-config";


/*
geom: "POLYGON ((5.474286 51.762729, 5.474056 51.762111, 5.474823 51.76174, 5.475819 51.761989, 5.476049 51.762608, 5.475283 51.762978, 5.474286 51.762729))"
school_density_per_sqkm: 0
school_density_per_sqkm.category: "10"
*/

export class MarvinLayer {

	public id: string;
	public name: string;
	public color: string;
	public data: FeatureCollection;
	public visible: Writable<boolean> = writable(true);
	private visibleUnsubscribe?: Unsubscriber = undefined;

	public map: Map;
	public colorCategories: string[] | undefined;
	public geojsonLayer: GeoJsonLayer;

	constructor(id: string, name: string, color: string, map: Map, data: any) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.data = data;
		this.map = map;

		this.colorCategories = this.getColorCategories();
		this.removeCategoryProperties();

		//@ts-ignore
		const layerConfig: LayerConfig = {
			id: this.id,
			settings: {
				clampToGround: true,
				markers: []
			}
		};
		this.geojsonLayer = new GeoJsonLayer(map, layerConfig, data);
		this.geojsonLayer.defaultColorPoint = Cesium.Color.fromCssColorString(this.color);
		this.geojsonLayer.defaultColorPolygon = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(this.color));
		this.geojsonLayer.defaultColorLine = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(this.color));
		this.visibleUnsubscribe = this.visible.subscribe((v) => v ? this.show() : this.hide())
	}


	public zoomTo() {
		this.geojsonLayer.zoomTo();
	}

	private show(): void {
		this.geojsonLayer.show();
		this.map.refresh();
	}

	private hide(): void {
		this.geojsonLayer.hide();
		this.map.refresh();
	}

	public delete(): void {
		this.geojsonLayer.removeFromMap();
		this.visibleUnsubscribe?.();
		this.map.refresh();
	}


	protected getColorCategories(): Array<string> | undefined {
		// check the first feature in data and see if there is a property which contains .category
		const feature = this.data.features[0];
		if (!feature?.properties) {
			return undefined;
		}
		const keys = Object.keys(feature.properties);
		const categories = keys
			.filter((key) => key.toLowerCase().endsWith(".category"))
			.map((key) => key.slice(0, -9)); 
		if (categories.length === 0) {
			return undefined;
		}
		return categories;
	}

	protected removeCategoryProperties(): void {
		for (const feature of this.data.features) {
			if (feature.properties) {
				for (const key of Object.keys(feature.properties)) {
					if (key.toLowerCase().endsWith(".category")) {
						delete feature.properties[key];
					}
				}
			}
		}
	}

	protected getCategoryUniqueValue(category: string): Array<number> {
		const values = new Set<number>();
		for (const feature of this.data.features) {
			const value = feature.properties?.[category];
			if (value) {
				values.add(value);
			}
		}
		return Array.from(values).sort((a, b) => a - b);
	}

	protected createColorMap(category: string): Array<{ value: number; color: string }> | undefined {
		const values = this.getCategoryUniqueValue(category);
		if (values.length < 2) {
			return undefined;
		}
		const colorRange = getColorRange(this.color, values.length).reverse();

		return values.map((value, index) => {
			return {
				value,
				color: colorRange[index]
			};
		});
	}
}
