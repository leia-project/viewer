import type { Map } from "$lib/components/map-cesium/module/map";
import { writable, type Unsubscriber, type Writable } from "svelte/store";
import { MarvinLayer } from "./marvin-layer";


export class QALayer extends MarvinLayer {
	private effectOnce = false;

	public qaId: string;
	public colorCategories: string[] | undefined;
	public selectedCategory: Writable<string> = writable("none");
	private selectedCategoryUnsubscriber?: Unsubscriber = undefined;
	public colorMap: { value: number; color: string }[] | undefined;
	public menuOpen: boolean = false;

	constructor(map: Map, qaId: string, idPrefix: string, datasetName: string, color: string, featureCollection: any) {
		const id = `${idPrefix}_${qaId}`;
		super(id, datasetName, color, map, featureCollection);

		this.qaId = qaId;

		this.colorCategories = this.getColorCategories();

		this.selectedCategoryUnsubscriber = this.selectedCategory.subscribe((cat) => {
			if (!this.effectOnce) {
				if (this.colorCategories) {
					this.setColorCategory(this.colorCategories[0]);
				}

				this.effectOnce = true;
			} else {
				this.setColorCategory(cat);
			}
		});
	}

	public setColorCategory(category: string) {
		this.selectedCategory.set(category);
		this.colorMap = category === "none" ? undefined : this.createColorMap(category);
		//this.setFillPaintCategory(category, this.colorMap);
	}

	/* private setFillPaintCategory(category: string, colorMap: { value: number; color: string }[] | undefined) {
		const fill = {
			"fill-color": ["match", ["get", category]],
			"fill-opacity": 0.6
		};

		if (colorMap) {
			for (const entry of colorMap) {
				fill["fill-color"].push(entry.value.toString());
				fill["fill-color"].push(entry.color);
			}

			// default color
			fill["fill-color"].push(this.color);
		} else {
			fill["fill-color"] = this.color;
		}

		this.updatePolygonFill(fill["fill-color"], fill["fill-opacity"]);
		//this.paintPolygonFill = fill;
	} */
}
