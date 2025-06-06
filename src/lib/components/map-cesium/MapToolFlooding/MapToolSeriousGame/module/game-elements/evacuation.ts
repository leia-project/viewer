import type { BottleNeck, ExtractionPoint } from "./roads/bottle-neck";
import type { Hexagon } from "./hexagons/hexagon";
import type { RouteFeature } from "./api/routing-api";


export class Evacuation {

	private route: Array<RouteFeature>;
	private hexagon: Hexagon;
	private extractionPoint: ExtractionPoint;
	private includedBottlenecks: Array<BottleNeck> = [];
	private step: number = 0;

	constructor(route: Array<RouteFeature>, hexagon: Hexagon, extractionPoint: ExtractionPoint) {
		this.route = route;
		this.hexagon = hexagon;
		this.extractionPoint = extractionPoint;
	}

	public destroy(): void {
		this.hexagon.evacuation = undefined;
		
	}
	
	private displayEvacuation(): void {
		// display evacuation on map
	}

}
