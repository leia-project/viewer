import * as Cesium from 'cesium';
import type { Map } from "$lib/map-cesium/map";


/**
 * Samples the terrain height at the given longitude/latitude using Cesium's
 * standard terrain sampling.
 */
export async function getTerrainHeight(map: Map, lon: number, lat: number): Promise<number | undefined> {
	try {
		const sample = await Cesium.sampleTerrainMostDetailed(map.viewer.terrainProvider, [
			Cesium.Cartographic.fromDegrees(lon, lat)
		]);
		return sample[0]?.height;
	} catch (e) {
		console.log('Error getting terrain height: ', e);
		return undefined;
	}
}