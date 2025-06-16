import * as Cesium from "cesium";
import type { Hexagon } from "./hexagons/hexagon";
import type { Map } from "$lib/components/map-cesium/module/map";
import type { RouteSegment } from "./roads/route-segments";


export class Evacuation {

	public route: Array<RouteSegment>;
	public hexagon: Hexagon;
	public extractionPoint: RouteSegment;
	public numberOfPersons: number;
	public time: number;
	private map: Map;

	private dataSource: Cesium.CustomDataSource;
	private interval?: NodeJS.Timeout;
	private shown: boolean = false;

	constructor(route: Array<RouteSegment>, hexagon: Hexagon, extractionPoint: RouteSegment, numberOfPersons: number, time: number, map: Map) {
		this.route = route;
		this.hexagon = hexagon;
		this.extractionPoint = extractionPoint;
		this.numberOfPersons = numberOfPersons;
		this.time = time;
		this.map = map;
		this.dataSource = new Cesium.CustomDataSource();
		this.makeEntities(route);
	}

	/*	
	private makeEntities(positions: Array<[lon: number, lat: number]>): void {
		const cartesians = positions.map((p) => Cesium.Cartesian3.fromDegrees(p[0], p[1]));
		const numberOfCoordinates = cartesians.length;
		const stepInterval = Math.max(1, Math.round(numberOfCoordinates / 40)); // 40 steps, minimum step size of 1
		let i = 0;
		while (i < numberOfCoordinates + stepInterval) {
			const lastPositionIndex = Math.min(i+stepInterval, numberOfCoordinates);
			const line = this.makeLineEntity(cartesians.slice(i, lastPositionIndex + 1));
			this.dataSource.entities.add(line);
			i+=stepInterval;
		}
	}
	*/

	private makeEntities(route: Array<RouteSegment>): void {
		for (const routeFeature of route) {
			const entity = this.makeWallEntity(routeFeature);
			this.dataSource.entities.add(entity);
		}
	}

	private makeWallEntity(route: RouteSegment): Cesium.Entity {
		const linePositions = route.feature.geometry.coordinates.map((p) => Cesium.Cartesian3.fromDegrees(p[0], p[1], 1000));
		return new Cesium.Entity({
			wall: {
				positions: linePositions,
				material: Cesium.Color.ORANGERED
			},
			properties: route.feature.properties,
			show: false
		});
	} 

	private animate(): void {
		const lineSegments = this.dataSource.entities.values;
		if (lineSegments.length === 0) return;
		lineSegments.map((lineSegment) => lineSegment.show = false);
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
	
	public display(): void {
		if (this.shown) {
			return;
		}
		if (!this.map.viewer.dataSources.contains(this.dataSource)) {
			this.map.viewer.dataSources.add(this.dataSource);
		}
		this.animate();
		this.shown = true;
	}

	public hide(): void {
		if (!this.shown) {
			return;
		}
		if (this.interval) clearInterval(this.interval);
		this.dataSource.entities.values.forEach((entity) => entity.show = false);
		this.map.viewer.dataSources.remove(this.dataSource, true);
		this.shown = false;
	}
	
	public destroy(): void {
		this.hexagon.removeEvacuation(this);
	}

}
