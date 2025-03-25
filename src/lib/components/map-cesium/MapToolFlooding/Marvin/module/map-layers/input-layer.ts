import type { Map } from "$lib/components/map-cesium/module/map";
import { MarvinLayer } from "./marvin-layer";

export class InputLayer extends MarvinLayer {
	public qaId: string;

	constructor(map: Map, qaId: string, idPrefix: string, datasetName: string, color: string, featureCollection: any) {
		const id = `${idPrefix}_${qaId}`;
		super(id, datasetName, color, map, featureCollection);

		this.qaId = qaId;
/* 
		this.paintPolygonOutline = {
			"line-color": this.color,
			"line-width": 2,
			"line-dasharray": [2, 2]
		};

		this.polygonOutline = true;
		this.polygonFill = false;

		this.tryCreateLayer(); */
	}
}
