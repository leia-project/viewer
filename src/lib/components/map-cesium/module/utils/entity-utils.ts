// Functions to make Cesium entities from GeoJSON
// Only use if Cesium.GeoJsonDataSource cannot be used

import * as Cesium from "cesium";


export function addGeoJsonPoint(coordinates: Array<number>, properties: {[propertyName: string]: any}): Cesium.Entity {
	const entity = new Cesium.Entity({
		position: Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]),
		point: {
			pixelSize: 10,
			color: Cesium.Color.RED,
			outlineColor: Cesium.Color.WHITE,
			outlineWidth: 2,
		},
		label: {
			text: properties["name"],
			font: "14pt monospace",
			style: Cesium.LabelStyle.FILL_AND_OUTLINE,
			outlineWidth: 2,
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
			pixelOffset: new Cesium.Cartesian2(0, -9),
		},
		properties: properties,
	});
	return entity
}

export function addGeoJsonLine(coordinates: Array<Array<number>>, properties: {[propertyName: string]: any}): Cesium.Entity {
	const entity = new Cesium.Entity({
		polyline: {
			positions: Cesium.Cartesian3.fromDegreesArray(coordinates.flat()),
			width: 5,
			material: Cesium.Color.RED,
		},
		label: {
			text: properties["name"],
			font: "14pt monospace",
			style: Cesium.LabelStyle.FILL_AND_OUTLINE,
			outlineWidth: 2,
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
			pixelOffset: new Cesium.Cartesian2(0, -9),
		},
		properties: properties,
	});
	return entity
}

export function addGeoJsonMultiLine(coordinates: Array<Array<Array<number>>>, properties: {[propertyName: string]: any}): Cesium.Entity {
	const entity = new Cesium.Entity({
		polyline: {
			positions: Cesium.Cartesian3.fromDegreesArray(coordinates.flat(2)),
			width: 5,
			material: Cesium.Color.RED,
		},
		label: {
			text: properties["name"],
			font: "14pt monospace",
			style: Cesium.LabelStyle.FILL_AND_OUTLINE,
			outlineWidth: 2,
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
			pixelOffset: new Cesium.Cartesian2(0, -9),
		},
		properties: properties,
	});
	return entity
}

export function addGeoJsonPolygon(feature: any): Cesium.Entity {
	const coordinates = feature.geometry.coordinates;
	const properties = feature.properties;
	const entity = new Cesium.Entity({
		polygon: {
			hierarchy: Cesium.Cartesian3.fromDegreesArray(coordinates.flat()),
			material: Cesium.Color.RED.withAlpha(0.5),
			outline: true,
			outlineColor: Cesium.Color.BLACK,
		},
		label: {
			text: properties["name"],
			font: "14pt monospace",
			style: Cesium.LabelStyle.FILL_AND_OUTLINE,
			outlineWidth: 2,
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
			pixelOffset: new Cesium.Cartesian2(0, -9),
		},
		properties: properties,
	});
	return entity
}

export function processGeoJSON(data: any): void {
	const features = data.features;
	for (let i = 0; i < features.length; i++) {
		const featureType = features[i].geometry.type;
		const coordinates = features[i].geometry.coordinates;
		const properties = features[i].properties;
		switch (featureType) {
			case "Point":
				addGeoJsonPoint(coordinates, properties);
				break;
			case "LineString":
				addGeoJsonLine(coordinates, properties);
				break;
			case "MultiLineString":
				addGeoJsonMultiLine(coordinates, properties);
			case "Polygon":
				addGeoJsonPolygon(features[i]);
				break;
			default:
				break;
		}
	}
}