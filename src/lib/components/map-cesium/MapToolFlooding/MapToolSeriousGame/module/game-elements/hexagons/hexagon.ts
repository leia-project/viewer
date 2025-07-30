import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { gsap } from "gsap";
import { Evacuation } from "../evacuation";
import PolygonGeometry from "./polygon-geometry";


export class Hexagon {

	public hex: string;
	public center: [lon: number, lat: number];
	public centerCartesian3: Cesium.Cartesian3;
	public evacuationPoints: Array<[lon: number, lat: number]>;
	public population: number;
	public floodDepth: Writable<number> = writable(0);
	public floodedAt: Writable<number | undefined> = writable(undefined);

	private selectedHexagon: Writable<Hexagon | undefined>;
	public selectedRoute: Array<number> = [];

	public status: "accessible" | "flooded" | "evacuated" = "accessible";

	public geometryInstances: Array<Cesium.GeometryInstance>;
	public parentPrimitive: Cesium.Primitive | undefined;
	public entityInstance: Cesium.Entity;
	
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
		col.alpha = 1;
		return col;
	});
	private color: Cesium.Color = this.cesiumColors[0];

	public evacuations: Writable<Array<Evacuation>> = writable([]);
	public totalEvacuated: Readable<number> = derived(this.evacuations, ($evacuations) => {
  		return $evacuations.reduce((total, evac) => total + evac.numberOfPersons, 0);
	});
	private evacuatedCount: number = 0; // Only for animation

	constructor(hex: string, population: number, selectedHexagon: Writable<Hexagon | undefined>) {
		this.hex = hex;
		const latLon = cellToLatLng(hex);
		this.center = [latLon[1], latLon[0]];
		this.centerCartesian3 = Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1], this.getHexagonHeight(population) * 0.01); // 0.01 is exag_1 uniform
		this.evacuationPoints = this.getEvacuationPoints();
		this.population = population;
		this.selectedHexagon = selectedHexagon;
		this.geometryInstances = this.createGeometryInstance(hex, population);
		this.entityInstance = this.createEntityInstance(hex, population);

		this.selectedHexagon.subscribe((selected: Hexagon | undefined) => {
			selected === this ? this.displayEvacuations() : this.hideEvacuations();
		});

		this.floodDepth.subscribe((depth: number) => {
			this.setColor(depth);
			if (depth > 0.5) {
				//this.floodedAt.set(get(elapsedTime));
			}
		});


		this.totalEvacuated.subscribe((evacuated: number) => {
			if (evacuated > 0) {
				this.updateStatus("evacuated");
			} else {
				this.updateStatus("accessible");
			}
			//this.centerCartesian3 = Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1], this.getHexagonHeight(this.population - eva) * 0.01);  // 0.01 is exag_1 uniform
			gsap.to(this, {
				evacuatedCount: evacuated,
				duration: 0.7,
				onUpdate: () => this.updateAttributes()
			});
		});
	}

	public getHexVertices(cell: string = this.hex): Array<[lon: number, lat: number]> {
		const boundary = cellToBoundary(cell, true);
		return boundary.map((point) => [point[0], point[1]]);
	}

	private getEvacuationPoints(): Array<[lon: number, lat: number]> {
		const boundary = this.getHexVertices();
		const midpoints: Array<[number, number]> = boundary.map(([lon, lat]) => [
			(this.center[0] + lon) / 2,
			(this.center[1] + lat) / 2
		]);
		return [this.center, ...midpoints];
	}

	private createGeometryInstance(cell: string, population: number): Array<Cesium.GeometryInstance> {
		const boundary = this.getHexVertices(cell);
		const positions = Cesium.Cartesian3.fromDegreesArray(boundary.flat());

		//@ts-ignore
		const polygonGeometry = new PolygonGeometry({
			polygonHierarchy: new Cesium.PolygonHierarchy(positions),
			height: 0,
			extrudedHeight: 1
		});
		const geom = PolygonGeometry.createGeometry(polygonGeometry, []) as Cesium.Geometry;

		const base = 5500;
		const populationHeight = this.getHexagonHeight(this.population) + base;
		const remaingPopulationHeight = this.getHexagonHeight(this.population - this.evacuatedCount) + base;

		const bottom = new Cesium.GeometryInstance({
			geometry: geom,
			modelMatrix: Cesium.Matrix4.IDENTITY,
			id: cell,
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(this.color),
				offsetBottom: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [base]
				}),
				offsetTop: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [remaingPopulationHeight]
				}),
				show: new Cesium.ShowGeometryInstanceAttribute(true)
			}
		});
		const top = new Cesium.GeometryInstance({
			geometry: geom,
			modelMatrix: Cesium.Matrix4.IDENTITY,
			id: `${cell}-top`,
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE.withAlpha(0.5)),
				offsetBottom: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [remaingPopulationHeight] // 0.01 is exag_1 uniform
				}),
				offsetTop: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [populationHeight]
				}),
				show: new Cesium.ShowGeometryInstanceAttribute(populationHeight !== remaingPopulationHeight),
			}
		});
		return [bottom, top]; 
	}

	private updateAttributes(): void {
		if (this.parentPrimitive?.ready) {
			const base = 5500;
			const populationHeight = this.getHexagonHeight(this.population) + base;
			const remaingPopulationHeight = this.getHexagonHeight(this.population - this.evacuatedCount) + base;
			const attributesBottom = this.parentPrimitive.getGeometryInstanceAttributes(this.hex);
			const attributesTop = this.parentPrimitive.getGeometryInstanceAttributes(`${this.hex}-top`);
			attributesBottom.offsetBottom = [base];
			attributesBottom.offsetTop = [remaingPopulationHeight]; // 0.01 is exag_1 uniform
			attributesTop.offsetBottom = [remaingPopulationHeight];
			attributesTop.offsetTop = [populationHeight];
			attributesTop.show = Cesium.ShowGeometryInstanceAttribute.toValue(populationHeight !== remaingPopulationHeight, attributesTop.show);

		}
	}

	private createEntityInstance(cell: string, population: number): Cesium.Entity {
		const boundary = this.getHexVertices(cell)
		const color = this.valueToColor(population);
		const positions = Cesium.Cartesian3.fromDegreesArray(boundary.flat());
		const entity = new Cesium.Entity({
			polygon: {
				hierarchy: positions,
				material: color.withAlpha(1.0),
				fill: true,
				heightReference: Cesium.HeightReference.RELATIVE_TO_TERRAIN
			},
		});
		
		return entity;
	}

	public valueToColor(value: number): Cesium.Color {
		const colors = this.cesiumColors;
		const index = Math.min(Math.floor((value / 19270) * colors.length), colors.length - 1);
		return colors[index];
	}

	private getHexagonHeight = (population: number) => {
		return population * 10 + 50;
	}

	public updateStatus(status: "accessible" | "flooded" | "evacuated"): void {
		this.status = status;
	}

	public addEvacuations(evacuations: Array<Evacuation>): void {
		this.evacuations.update((c) => [...c, ...evacuations]);
		if (get(this.selectedHexagon) === this) {
			this.displayEvacuations();
  	  	}
	}

	public removeEvacuation(evacuation: Evacuation): void {
		this.evacuations.update((c) => c.filter((e) => e !== evacuation));
	}

	public displayEvacuations(): void {
		const evacuations = get(this.evacuations);
		evacuations.forEach((evacuation) => {
			evacuation.display(evacuations);
		});
	}

	 public hideEvacuations(): void {
		get(this.evacuations).forEach((evacuation) => {
			evacuation.hide();
		});
	}

	public highlight(event: "click" | "hover"): void {
		if (event === "hover" && this === get(this.selectedHexagon)) return;
		if (!this.parentPrimitive?.ready) return;
		const color = event === "hover" ? Cesium.Color.LIGHTPINK : Cesium.Color.HOTPINK;
		const attributes = this.parentPrimitive?.getGeometryInstanceAttributes(this.hex);
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(color, attributes.color); // this.valueToColor(this.population);
		if (this.entityInstance.polygon) {
			this.entityInstance.polygon.material = new Cesium.ColorMaterialProperty(color);
		}
	}

	public unhighlight(event: "click" | "hover"): void {
		if (event === "hover" && this === get(this.selectedHexagon)) return;
		if (!this.parentPrimitive?.ready) return;
		const attributes = this.parentPrimitive?.getGeometryInstanceAttributes(this.hex);
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(this.color, attributes.color);
		if (this.entityInstance.polygon) {
			const color = this.valueToColor(this.population);
			this.entityInstance.polygon.material = new Cesium.ColorMaterialProperty(color);
		}
	}

	private setColor(depth: number): void {
		const colorIndex = Math.min(Math.floor(depth * 2.5), this.colorScale.length - 1);
		this.color = Cesium.Color.fromCssColorString(this.colorScale[colorIndex]);
		if (this !== get(this.selectedHexagon)) this.unhighlight("click");
	}
		
}
