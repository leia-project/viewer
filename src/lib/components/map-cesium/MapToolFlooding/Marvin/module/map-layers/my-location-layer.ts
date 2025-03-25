// @ts-ignore
import Wkt from "wicket";
import { MarvinLayer } from "./marvin-layer";
import type { Map } from "$lib/components/map-cesium/module/map";


export class MyLocationLayer extends MarvinLayer {
	constructor(map: Map, wktGeom: any) {
		const wkt = new Wkt.Wkt();
		const geom = wkt.read(wktGeom);

		const featureCollection = {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: {},
					geometry: geom.toJson()
				}
			]
		};
		const id = Math.random().toString(36).substring(7);
		super(id, "my location", "#000", map, featureCollection);
	}
}
