import * as Cesium from "cesium";
import { writable, type Writable } from "svelte/store";
import { Evacuation } from "./evacuation";

interface IHexagonFetch {
	hex: number;
	center: { lat: number; lon: number };
	population: number;
	floodedAfter: number;
}

export class HexagonLayer {

	private primitive?: Cesium.Primitive;
	public hexagons: Array<Hexagon> = [];
	public selectedHexagon: Writable<Array<Hexagon>> = writable([]);

	constructor(scenario: string) {
		this.loadHexagons(scenario);
		this.selectedHexagon.subscribe((hexagons: Array<Hexagon>) => {
		});
	}

	private async loadHexagons(scenario: string): Promise<void> {
		// load hexagons from server
		const hexagons = [] as Array<IHexagonFetch>;

		// Add to map
		hexagons.forEach((hex: IHexagonFetch) => {
			const newHex = new Hexagon(hex.hex, hex.center, hex.population);
			this.hexagons.push(newHex);
		});

		this.createPrimitive();
	}

	private createPrimitive(): void {
		this.primitive?.destroy();
		const geometries = this.hexagons.map((hex: Hexagon) => hex.geometryInstance);
		const appearance = new Cesium.PerInstanceColorAppearance({
			translucent: false,
			closed: true
		});
		const primitive = new Cesium.Primitive({
			geometryInstances: new Cesium.GeometryInstance({
				geometry: geometries,
				attributes: {
					color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED)
				}
			}),
			appearance: appearance,
			asynchronous: false
		});
		this.primitive = primitive;
	}

	

	private addEvents(): void {
		// make hexagons selectable
	}

	private setTotals(): { evacuated: number } {
		return this.hexagons.reduce((acc: { evacuated: number }, hex: Hexagon) => {
			acc.evacuated += hex.evacuated;
			return acc;
		}, { evacuated: 0 });
	}
}



export class Hexagon {

	public hex: number;
	public center: { lat: number; lon: number };
	public population: number;
	public evacuated: number = 0;
	public floodedAfter: number = 0;

	public selectedRoute: Array<number> = [];

	public status: "accessible" |  "inaccessible" | "flooded" | "evacuated" = "accessible";

	public geometryInstance: Cesium.GeometryInstance;

	public evacuation?: Evacuation;

	constructor(hex: number, center: { lat: number; lon: number }, population: number) {
		this.hex = hex;
		this.center = center;
		this.population = population;
		this.geometryInstance = this.createGeometryInstance();
	}

	private createGeometryInstance(): Cesium.GeometryInstance {
		return new Cesium.GeometryInstance({
			id: this.hex,
			geometry: new Cesium.PolygonGeometry({
				polygonHierarchy: new Cesium.PolygonHierarchy(
					Cesium.Cartesian3.fromDegreesArray([
						this.center.lon, this.center.lat,
						this.center.lon + 0.1, this.center.lat,
						this.center.lon + 0.1, this.center.lat + 0.1,
						this.center.lon, this.center.lat + 0.1
					])
				)
			}),
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED)
			}
		});
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