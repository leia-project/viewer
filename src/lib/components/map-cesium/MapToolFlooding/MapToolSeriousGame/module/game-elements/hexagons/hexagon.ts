import * as Cesium from "cesium";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { Evacuation } from "../evacuation";
import PolygonGeometry from "./polygon-geometry";


export class Hexagon {

	public hex: string;
	public center: [lon: number, lat: number];
	public population: number;
	public evacuated: number = 0;
	public floodedAfter?: number;

	public selectedRoute: Array<number> = [];

	public status: "accessible" |  "inaccessible" | "flooded" | "evacuated" = "accessible";

	public geometryInstance: Cesium.GeometryInstance;
	public colorScale = [
		"#1a9850", // dark green
		"#66bd63", // green
		"#a6d96a", // yellow-green
		"#d9ef8b", // light yellow
		"#ffffbf", // pale yellow
		"#fee08b", // light orange
		"#fdae61", // orange
		"#f46d43", // reddish orange
		"#d73027", // red
		"#a50026", // dark red
		"#800026"  // deeper red
	]; //https://colordesigner.io/gradient-generator    -  https://uigradients.com/#TheBlueLagoon
	private cesiumColors = this.colorScale.map((color, i) => {
		const col = Cesium.Color.fromCssColorString(color);
		col.alpha = Math.min(1, i / this.colorScale.length + 0.1);
		return col;
	});

	public evacuation?: Evacuation;

	constructor(hex: string, population: number, floodedAfter: number | undefined) {
		this.hex = hex;
		const latLon = cellToLatLng(hex);
		this.center = [latLon[1], latLon[0]];
		this.population = population;
		this.floodedAfter = floodedAfter;
		this.geometryInstance = this.createGeometryInstance(hex, population);
	}

	private createGeometryInstance(cell: string, population: number): Cesium.GeometryInstance {
		const boundary = cellToBoundary(cell, true);
		const degreesArray = new Array<number>();
		for (let j = 0; j < boundary.length; j++) {
			degreesArray.push(boundary[j][0], boundary[j][1]);
		}
		const positions = Cesium.Cartesian3.fromDegreesArray(degreesArray);

		//@ts-ignore
		const polygonGeometry = new PolygonGeometry({
			polygonHierarchy: new Cesium.PolygonHierarchy(positions),
			height: 60,
			extrudedHeight: 100
		});
		const geom = PolygonGeometry.createGeometry(polygonGeometry, []) as Cesium.Geometry;
		const geometryInstance = new Cesium.GeometryInstance({
			geometry: geom,
			modelMatrix: Cesium.Matrix4.IDENTITY,
			id: cell,
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(this.valueToColor(population)),
				population: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [this.getHexagonHeight(population)]
				})
			}
		});
		return geometryInstance;
	}

	public valueToColor(value: number): Cesium.Color {
		const colors = this.cesiumColors;
		const index = Math.min(Math.floor((value / 19270) * colors.length), colors.length - 1);
		return colors[index];
	}

	private getHexagonHeight = (population: number) => {
		return population * 10 + 50;
	}

	public timeUpdated(time: number): void {
		if (!this.floodedAfter) return;
		if (this.floodedAfter > 0 && this.floodedAfter <= time) {
			this.updateStatus("flooded");
		}
	}

	public updateStatus(status: "accessible" |  "inaccessible" | "flooded" | "evacuated"): void {
		this.status = status;
	}

	public addEvacuation(evacuation: Evacuation): void {
		// gsap update population
		const evacuees = evacuation.hexagon.population;
	}

}
