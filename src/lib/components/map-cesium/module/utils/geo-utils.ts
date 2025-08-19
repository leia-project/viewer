import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { Point, Polygon } from "geojson";

export function polygonToCartesians(polygon: Array<[lon: number, lat: number]>): Array<Cesium.Cartesian3> {
    return polygon.map((coords) => Cesium.Cartesian3.fromDegrees(coords[0], coords[1]));
}

export function turfPolygonToCartesians(polygon: Polygon | undefined): Array<Cesium.Cartesian3> {
    const cartesian = new Array<Cesium.Cartesian3>();
    for (let i = 0; i < polygon!.coordinates[0].length; i++) {
        const coords = polygon!.coordinates[0][i];
        cartesian.push(Cesium.Cartesian3.fromDegrees(coords[0], coords[1]));
    }
    return cartesian;
}

export function pointToCartesian3(point: Point): Cesium.Cartesian3 {
    return Cesium.Cartesian3.fromDegrees(point.coordinates[0], point.coordinates[1]);
}

export function getPolygonCenter(geometry: Array<[lon: number, lat: number]>): [lon: number, lat: number] {
    const center = turf.centerOfMass(turf.polygon([geometry]));
    return [center.geometry.coordinates[0], center.geometry.coordinates[1]];
}


export function getCartesian2(m: any): Cesium.Cartesian2 {
    return new Cesium.Cartesian2(m.x, m.y);
}