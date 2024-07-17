import { get } from "svelte/store";
import { ThreedeeLayer } from "../layers/threedee-layer";

import type { Map } from "../map.js";

export function Get3dLayers(map: Map) : Array<ThreedeeLayer> {
    const threedeeLayers = new Array<ThreedeeLayer>();
    const layers = get(map.layers);

    for(let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        
        if(layer instanceof ThreedeeLayer) {
            threedeeLayers.push(layer);
        }
    }

    return threedeeLayers;
}

export function getFeatureBounds(gj) {
    var coords, bbox;
    if (!gj.hasOwnProperty("type")) return;
    coords = getFeatureCoordinatesDump(gj);
    bbox = [
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY
    ];
    return coords.reduce(function (prev, coord) {
        return [
            Math.min(coord[0], prev[0]),
            Math.min(coord[1], prev[1]),
            Math.max(coord[0], prev[2]),
            Math.max(coord[1], prev[3])
        ];
    }, bbox);
}

export function getCenter(gj) {
    const bounds = getFeatureBounds(gj);
    return [bounds[0] + (bounds[2] - bounds[0]) / 2, bounds[1] + (bounds[3] - bounds[1]) / 2];
}

export function getFeatureCoordinatesDump(gj) {
    var coords;
    if (gj.type == "Point") {
        coords = [gj.coordinates];
    } else if (gj.type == "LineString" || gj.type == "MultiPoint") {
        coords = gj.coordinates;
    } else if (gj.type == "Polygon" || gj.type == "MultiLineString") {
        coords = gj.coordinates.reduce(function (dump, part) {
            return dump.concat(part);
        }, []);
    } else if (gj.type == "MultiPolygon") {
        coords = gj.coordinates.reduce(function (dump, poly) {
            return dump.concat(
                poly.reduce(function (points, part) {
                    return points.concat(part);
                }, [])
            );
        }, []);
    } else if (gj.type == "Feature") {
        coords = getFeatureCoordinatesDump(gj.geometry);
    } else if (gj.type == "GeometryCollection") {
        coords = gj.geometries.reduce(function (dump, g) {
            return dump.concat(getFeatureCoordinatesDump(g));
        }, []);
    } else if (gj.type == "FeatureCollection") {
        coords = gj.features.reduce(function (dump, f) {
            return dump.concat(getFeatureCoordinatesDump(f));
        }, []);
    }
    return coords;
}
