import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { gsap } from "gsap";
import { Evacuation } from "../evacuation";
import PolygonGeometry from "./polygon-geometry";


export class Hexagon {

	public hex: string;
	public gm_naam?: string;
	public wk_naam?: string;
	public get name (): string {
		return this.gm_naam && this.wk_naam ? `${this.gm_naam} - ${this.wk_naam}` 
			: this.gm_naam ? this.gm_naam 
			: this.wk_naam ? this.wk_naam
			: this.hex;
	}
	public center: [lon: number, lat: number];
	public centerCartesian3: Cesium.Cartesian3;
	public evacuationPoints: Array<[lon: number, lat: number]>;
	public population: number;
	public floodDepth: Writable<number> = writable(0);
	public floodedAt: number | undefined;

	private selectedHexagon: Writable<Hexagon | undefined>;
	public selectedRoute: Array<number> = [];

	public status: Writable<"accessible" | "flooded" | "evacuated"> = writable("accessible");

	public geometryInstances: Array<Cesium.GeometryInstance>;
	public parentPrimitive: Cesium.Primitive | undefined;
	public entityInstance: Cesium.Entity;
	public highlightEntityInstance: Cesium.Entity;
	
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
	]; //https://colordesigner.io/gradient-generator - https://uigradients.com/#TheBlueLagoon
	private cesiumColors = this.colorScale.map((color) => {
		const col = Cesium.Color.fromCssColorString(color);
		col.alpha = 1;
		return col;
	});
	public color: Writable<Cesium.Color> = writable(this.cesiumColors[0]);
	private alpha: number = 1;

	public evacuations: Writable<Array<Evacuation>> = writable([]);
	public totalEvacuated: Readable<number> = derived(this.evacuations, ($evacuations) => {
  		return $evacuations.reduce((total, evac) => total + evac.numberOfPersons, 0);
	});
	private evacuatedCount: number = 0; // Only for animation

	public victims: Readable<number> = derived(this.status, ($status) => {
		if ($status === "flooded") {
			return this.population - get(this.totalEvacuated);
		}
		return 0;
	});

	constructor(hex: string, population: number, selectedHexagon: Writable<Hexagon | undefined>, gm_naam?: string, wk_naam?: string, ) {
		this.hex = hex;
		this.gm_naam = gm_naam;
		this.wk_naam = wk_naam;
		const latLon = cellToLatLng(hex);
		this.center = [latLon[1], latLon[0]];
		this.centerCartesian3 = Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1], this.getHexagonHeight(population) * 0.01); // 0.01 is exag_1 uniform
		this.evacuationPoints = this.getEvacuationPoints();
		this.population = population;
		this.selectedHexagon = selectedHexagon;
		this.geometryInstances = this.createGeometryInstances(hex);
		this.entityInstance = this.createEntityInstance(hex);
		this.highlightEntityInstance = this.createEntityInstance(hex, "-highlight", false);
		this.updateEntityColor();

		this.selectedHexagon.subscribe((selected: Hexagon | undefined) => {
			selected === this ? this.displayEvacuations() : this.hideEvacuations();
		});

		this.floodDepth.subscribe((depth: number) => {
			this.updateStatus();
		});

		this.totalEvacuated.subscribe((evacuated: number) => {
			this.updateStatus();
			gsap.to(this, {
				evacuatedCount: evacuated,
				duration: 0.7,
				onUpdate: () => this.updateAttributes(),
				onComplete: () => {
					this.updateEntityColor();
				}
			});
		});
	}

	public getHexVertices(cell: string = this.hex): Array<[lon: number, lat: number]> {
		const boundary = cellToBoundary(cell, true);
		return boundary.map((point) => [point[0], point[1]]);
	}

	private getHexVerticesInset(cell: string = this.hex, distanceMeters: number = 25): Array<[lon: number, lat: number]> {
		const boundary = cellToBoundary(cell, true);
		const center = this.center;
		return boundary.map(([lon, lat]) => {
			const from = Cesium.Cartesian3.fromDegrees(lon, lat);
			const to = Cesium.Cartesian3.fromDegrees(center[0], center[1]);
			const direction = Cesium.Cartesian3.subtract(to, from, new Cesium.Cartesian3());
			Cesium.Cartesian3.normalize(direction, direction);
			const moved = Cesium.Cartesian3.multiplyByScalar(direction, distanceMeters, new Cesium.Cartesian3());
			const inset = Cesium.Cartesian3.add(from, moved, new Cesium.Cartesian3());
			const carto = Cesium.Cartographic.fromCartesian(inset);
			return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
		});
	}

	private getEvacuationPoints(): Array<[lon: number, lat: number]> {
		const boundary = this.getHexVertices();
		const midpoints: Array<[number, number]> = boundary.map(([lon, lat]) => [
			(this.center[0] + lon) / 2,
			(this.center[1] + lat) / 2
		]);
		return [this.center, ...midpoints];
	}

	private createGeometryInstances(cell: string): Array<Cesium.GeometryInstance> {
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
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(get(this.color)),
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

	private createEntityInstance(cell: string, suffix?: string, show: boolean = true): Cesium.Entity {
		const boundary = this.getHexVerticesInset(cell, 20)
		const positions = Cesium.Cartesian3.fromDegreesArray(boundary.flat());
		const entity = new Cesium.Entity({
			id: `hexagon-${cell}${suffix}`,
			polygon: {
				hierarchy: positions, 
				fill: true,
				heightReference: Cesium.HeightReference.NONE,
				zIndex: 1
			},
			show: show
		});
		return entity;
	}

	private updateEntityColor(): void {
		if (this.entityInstance.polygon) {
			this.entityInstance.polygon.material = new Cesium.ColorMaterialProperty(get(this.color).withAlpha(this.alpha));
		}
		if (this.highlightEntityInstance.polygon) {
			const darkenedColor = this.darkenColor(get(this.color), 0.8);
			this.highlightEntityInstance.polygon.material = new Cesium.ColorMaterialProperty(darkenedColor.withAlpha(this.alpha));
		}
	}

	private getHexagonHeight = (population: number) => {
		return population * 10;
	}

	public updateStatus(): void {
		const isEvacuated = get(this.totalEvacuated) === this.population;
		const isFlooded = get(this.floodDepth) > 0.5;
		if (isEvacuated) {
			this.status.set("evacuated");
		} else if (isFlooded) {
			this.status.set("flooded");
		} else {
			this.status.set("accessible");
		}
		this.setColor(get(this.floodDepth));
	}

	private setColor(depth: number): void {
		let color: string = "white";
		if (get(this.status) === "evacuated") {
			color = "gray";
		} else {
			const colorIndex = Math.min(Math.floor(depth * 2.5), this.colorScale.length - 1);
			color = this.colorScale[colorIndex];
		}
		const cesiumColor = Cesium.Color.fromCssColorString(color);
		this.color.set(cesiumColor);
		this !== get(this.selectedHexagon) ? this.unhighlight("click") : this.highlight("click");
		this.updateEntityColor();
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
		const color = this.darkenColor(get(this.color), 0.8);
		const attributes = this.parentPrimitive?.getGeometryInstanceAttributes(this.hex);
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(color, attributes.color); // this.valueToColor(this.population);

		this.entityInstance.show = false;
		this.highlightEntityInstance.show = true;
	}

	public unhighlight(event: "click" | "hover"): void {
		if (event === "hover" && this === get(this.selectedHexagon)) return;
		if (!this.parentPrimitive?.ready) return;
		const attributes = this.parentPrimitive?.getGeometryInstanceAttributes(this.hex);
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(get(this.color), attributes.color);

		this.entityInstance.show = true;
		this.highlightEntityInstance.show = false;
	}

	public onAlphaUpdate(alpha: number): void {
		this.alpha = alpha;
		this.updateEntityColor();
	}

	private darkenColor(color: Cesium.Color, factor: number): Cesium.Color {
		return new Cesium.Color(
			Cesium.Math.clamp(color.red * factor, 0, 1),
			Cesium.Math.clamp(color.green * factor, 0, 1),
			Cesium.Math.clamp(color.blue * factor, 0, 1),
			color.alpha
		);
	}

}
