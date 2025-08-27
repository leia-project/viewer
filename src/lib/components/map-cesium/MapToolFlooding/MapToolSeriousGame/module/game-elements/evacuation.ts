import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "../../external-dependencies";
import type { Hexagon } from "./hexagons/hexagon";
import type { RouteSegment } from "./roads/route-segments";


export class Evacuation {

	public route: Array<RouteSegment>;
	public hexagon: Hexagon;
	public extractionPoint: RouteSegment;
	public numberOfPersons: number;
	public numberOfCars: number;
	public time: number;
	private map: Map;

	private dataSource: Cesium.CustomDataSource;
	private interval?: NodeJS.Timeout;
	public shown: Writable<boolean> = writable(false);

	constructor(route: Array<RouteSegment>, hexagon: Hexagon, extractionPoint: RouteSegment, numberOfPersons: number, numberOfCars: number, time: number, map: Map) {
		this.route = route;
		this.hexagon = hexagon;
		this.extractionPoint = extractionPoint;
		this.numberOfPersons = numberOfPersons;
		this.numberOfCars = numberOfCars;
		this.time = time;
		this.map = map;
		this.dataSource = new Cesium.CustomDataSource();
		this.makeEntities(route);
	}

	private makeEntities(route: Array<RouteSegment>): void {
		for (const routeFeature of route) {
			const entity = this.makeWallEntity(routeFeature);
			this.dataSource.entities.add(entity);
		}
	}

	private makeWallEntity(route: RouteSegment): Cesium.Entity {
		const linePositions = route.feature.geometry.coordinates.map((p) => Cesium.Cartesian3.fromDegrees(p[0], p[1], 1000));
		return new Cesium.Entity({
			name: route.feature.properties.fid.toString(),
			wall: {
				positions: linePositions,
				material: Cesium.Color.DARKGRAY.withAlpha(0.65)
			},
			properties: route.feature.properties,
			show: false
		});
	} 

	private animate(evacuationGroup: Array<Evacuation>): void {
		const lineSegments = this.dataSource.entities.values;
		if (lineSegments.length === 0) return;
		lineSegments.map((lineSegment) => lineSegment.show = false);
		lineSegments.forEach((lineSegment) => {
			const lineName = lineSegment.name as string;
			const wallHeight = this.getWallHeight(lineName, evacuationGroup);
			if (lineSegment.wall) {
				const numberOfPositions = lineSegment.wall.positions?.getValue(Cesium.JulianDate.now()).length || 1;
				lineSegment.wall.maximumHeights = new Cesium.ConstantProperty(Array(numberOfPositions).fill(wallHeight));
			}
		});

		const timeInterval = 1000 / lineSegments.length;
		if (this.interval) clearInterval(this.interval);
		let i = 0;
		this.interval = setInterval(() => {
			if (lineSegments[i]) {
				lineSegments[i].show = true;
				this.map.refresh();
			}
			if (i === lineSegments.length) clearInterval(this.interval);
			i++;
		}, timeInterval)
	}

	private getWallHeight(lineName: string, evacuationGroup: Array<Evacuation>): number {
		let height = this.numberOfPersons;
		for (const evac of evacuationGroup) {
			if (evac === this) break;
			const lineMatch = evac.route.find((r) => r.id === lineName);
			if (lineMatch) {
				height += evac.numberOfPersons
			}
		}
		return (height / 14) + 50;
	}

	public display(evacuationArray: Array<Evacuation>): void {
		if (get(this.shown) && evacuationArray.length === 0) {
			return;
		}
		if (!this.map.viewer.dataSources.contains(this.dataSource)) {
			this.map.viewer.dataSources.add(this.dataSource);
		}
		this.animate(evacuationArray);
		this.shown.set(true);
	}

	public hide(): void {
		if (!get(this.shown)) {
			return;
		}
		if (this.interval) clearInterval(this.interval);
		this.dataSource.entities.values.forEach((entity) => entity.show = false);
		this.map.viewer.dataSources.remove(this.dataSource, true);
		this.shown.set(false);
		this.map.refresh();
	}

	public toggle(evacuationArray: Array<Evacuation> = [], display?: boolean): void {
		if (display !== undefined) {
			display ? this.display(evacuationArray) : this.hide();
			return;
		}
		if (get(this.shown)) {
			this.hide();
		} else {
			this.display(evacuationArray);
		}
	}

	public destroy(): void {
		this.hexagon.removeEvacuation(this);
	}

}
