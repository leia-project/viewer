import * as Cesium from "cesium";
import * as turf from '@turf/turf';


export function getCartesian2(m: any): Cesium.Cartesian2 {
	return new Cesium.Cartesian2(m.x, m.y);
}

export function c3ArrayToPolygon(points: Array<Cesium.Cartesian3>, unkink: boolean = false): Array<[lon: number, lat: number]> {
	const radianArray = points.map((x) => Cesium.Cartographic.fromCartesian(x));
	let degreeArray = radianArray.map((x): [lon: number, lat: number] => [
		Cesium.Math.toDegrees(x.longitude), 
		Cesium.Math.toDegrees(x.latitude)
	]);
	degreeArray.push(degreeArray[0]);
	if (unkink) {
		const polygon = turf.polygon([degreeArray]);
		const unkinkedPolygon = turf.unkinkPolygon(polygon);
		degreeArray = unkinkedPolygon.features[0].geometry.coordinates[0].map((x) => [x[0], x[1]]);
	}
	return degreeArray;
}