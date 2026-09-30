import * as Cesium from "cesium";
import * as turf from '@turf/turf';

export function polygonToCartesians(polygon: Array<[lon: number, lat: number]>): Array<Cesium.Cartesian3> {
	return polygon.map((coords) => Cesium.Cartesian3.fromDegrees(coords[0], coords[1]));
}

export async function getPolygonOnTerrain(terrainProvider: Cesium.TerrainProvider, polygon: Array<Cesium.Cartesian3>, interval: number): Promise<{positions: Array<Cesium.Cartesian3>, averageHeight: number}> {
	const interpolatedPolygon: Array<Cesium.Cartesian3> = [];

	for (let i = 0; i < polygon.length; i++) {
		const start = polygon[i];
		const end = polygon[(i + 1) % polygon.length];
		interpolatedPolygon.push(start);

		const distance = Cesium.Cartesian3.distance(start, end);
		const numPointsToInject = Math.min(Math.floor(distance / interval), 10);
		const lineInterval = interval = distance / (numPointsToInject + 1);

		for (let j = 1; j <= numPointsToInject; j++) {
			const fraction = (j * lineInterval) / distance;
			const interpolatedPoint = Cesium.Cartesian3.lerp(start, end, fraction, new Cesium.Cartesian3());
			interpolatedPolygon.push(interpolatedPoint);
		}
	}
	
	const line = interpolatedPolygon.map((point) => Cesium.Cartographic.fromCartesian(point));
	const newPointsOnTerrain = await Cesium.sampleTerrainMostDetailed(terrainProvider, line);
	const averageHeight = newPointsOnTerrain.reduce((acc, point) => acc + point.height, 0) / newPointsOnTerrain.length;
	const newCartesiansOnTerrain = newPointsOnTerrain.map((point) => Cesium.Cartographic.toCartesian(point));
	return {
		positions: newCartesiansOnTerrain,
		averageHeight: averageHeight
	};
}


export function getPolygonCenter(geom: Array<[lon: number, lat: number]>): [lon: number, lat: number] {
	if (geom.length > 2 && (geom[0][0] !== geom[geom.length - 1][0] || geom[0][1] !== geom[geom.length - 1][1])) {
		geom.push(geom[0]);
	}
	const center = geom.length > 3
		? turf.centerOfMass(turf.polygon([geom]))
		: turf.center(turf.points(geom));
	return [center.geometry.coordinates[0], center.geometry.coordinates[1]];
}
