import * as Cesium from "cesium";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { Evacuation } from "../evacuation";
import PolygonGeometry from "./polygon-geometry";


export class Hexagon {

	public hex: string;
	public center: [lon: number, lat: number];
	public population: number;
	public evacuated: number = 0;
	public floodedAfter: number = 0;

	public selectedRoute: Array<number> = [];

	public status: "accessible" |  "inaccessible" | "flooded" | "evacuated" = "accessible";

	public geometryInstance: Cesium.GeometryInstance;
	public colorScale = [
		"#CACACA",
		"#40004b",
		"#762a83",
		"#9970ab",
		"#c2a5cf",
		"#e7d4e8",
		"#d9f0d3",
		"#a6dba0",
		"#5aae61",
		"#1b7837",
		"#00441b"
	]; //https://colordesigner.io/gradient-generator    -  https://uigradients.com/#TheBlueLagoon
	private cesiumColors = this.colorScale.map((color, i) => {
		const col = Cesium.Color.fromCssColorString(color);
		col.alpha = Math.min(1, i / this.colorScale.length + 0.1);
		return col;
	});

	public evacuation?: Evacuation;

	constructor(hex: string, population: number) {
		this.hex = hex;
		this.center = cellToLatLng(hex);
		this.population = population;
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
				}),
				previousPopulation: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [this.getHexagonHeight(0)]
				}),
			}
		});
		return geometryInstance;
	}

	private valueToColor(value: number): Cesium.Color {
		const colors = this.cesiumColors;
		const index = Math.min(Math.floor((value / 10) * colors.length), colors.length - 1);
		return colors[0];
	}

	private getHexagonHeight = (population: number) => {
		return population * 10 + 50;
	}

	public timeUpdated(time: number): void {
		if (this.floodedAfter > 0 && this.floodedAfter <= time) {
			this.updateStatus("flooded");
		}
	}

	public updateStatus(status: "accessible" |  "inaccessible" | "flooded" | "evacuated"): void {
		this.status = status;
	}

	public select(): void {
		// highlight hexagon
		// this.evacuation?.show();
	}

	public deselect(): void {
		// remove highlight
		// this.evacuation?.show();
	}

}
