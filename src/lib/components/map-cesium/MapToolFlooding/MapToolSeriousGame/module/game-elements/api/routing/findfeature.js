
import RBush from 'rbush';
import knn from 'rbush-knn';
import { bbox as turfBbox, pointToLineDistance as turfPointToLineDistance } from '@turf/turf';

let prevGeojson = null;
let index = null;

function featureToBBox(feature) {
  if (feature.bbox) {
    const bbox = feature.bbox;
    return { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] };
  }
  const bbox = turfBbox(feature);
  let minX = bbox[0]
  let minY = bbox[1]
  let maxX = bbox[2]
  let maxY = bbox[3]
  const deltax = (maxX - minX) * 0.05;
  const deltay = (maxY - minY) * 0.05;
  minX -= deltax;
  minY -= deltay;
  maxX += deltax;
  maxY += deltay;
  bbox[0] = minX;
  bbox[1] = minY;
  bbox[2] = maxX;
  bbox[3] = maxY;
  feature.bbox = bbox;
  return { minX, minY, maxX, maxY };
}

class WayRBush extends RBush {
  toBBox(feature) { 
    return featureToBBox(feature);
  }
  compareMinX (a,b) {
    const bbox1 = featureToBBox(a);
    const bbox2 = featureToBBox(b);
    return bbox1.minX - bbox2.minX;
  }
  compareMinY(a, b) {
    const bbox1 = featureToBBox(a);
    const bbox2 = featureToBBox(b);
    return bbox1.minY - bbox2.minY;
  }
}

function getIndex(geojson) {
    if (prevGeojson !== geojson) {
        const tree = new WayRBush();
        tree.load(geojson.features);
        index = tree;
        prevGeojson = geojson;
    }
    return index;
}

/* find nearest features in geojson to point, maxDistance defined in degrees(?) */
export function findFeature(geoJson, point, maxDistance = 0.01) {
    const index = getIndex(geoJson);
    const nearestFeatures = knn(index, point[0], point[1], 0, null, maxDistance);
    let minDistance = Infinity;
    let nearestFeature = null;
    for (const feature of nearestFeatures) {
        const distance = turfPointToLineDistance(point, feature, {units: 'meters'});
        if (distance < minDistance) {
            minDistance = distance
            nearestFeature = feature;
        }
    }
    return nearestFeature;
}