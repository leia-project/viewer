import { writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";
import { MarvinLayer } from "./marvin-layer";


export class QALayer extends MarvinLayer {

	public qaId: string;
	public selectedCategory: Writable<string | undefined> = writable(undefined);
	private selectedCategoryUnsubscriber?: Unsubscriber;
	public colorMap: Writable<Array<{ value: number; color: string }> | undefined> = writable(undefined);
	public menuOpen: boolean = false;

	constructor(map: Map, qaId: string, idPrefix: string, datasetName: string, color: string, featureCollection: any) {
		const id = `${idPrefix}_${qaId}`;
		super(id, datasetName, color, map, featureCollection);

		this.qaId = qaId;

		if (this.colorCategories) {
			this.selectedCategoryUnsubscriber = this.selectedCategory.subscribe((cat) => {
				if (!cat) {
					if (this.colorCategories) {
						this.selectedCategory.set(this.colorCategories[0]);
					}
				} else {
					this.setColorCategory(cat);
				}
			});
		}
	}

	public delete(): void {
		super.delete();
		this.selectedCategoryUnsubscriber?.();
	}

	public setColorCategory(category: string) {
		this.selectedCategory.set(category);
		const colorMap = this.createColorMap(category);
		this.colorMap.set(colorMap);
		if (colorMap && colorMap?.length > 1) {
			this.geojsonLayer.colorGradientStart = Cesium.Color.fromCssColorString(colorMap[0].color);
			this.geojsonLayer.colorGradientEnd = Cesium.Color.fromCssColorString(colorMap[colorMap.length - 1].color);
			this.geojsonLayer.style.set(category);
		}
	}
}
