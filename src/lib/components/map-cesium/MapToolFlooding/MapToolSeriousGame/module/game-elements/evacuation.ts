import type { BottleNeck, ExtractionPoint } from "./roads/bottle-neck";
import type { Hexagon } from "./hexagons/hexagon";
import type { RouteFeature } from "./api/routing-api";


export class Evacuation {

	private route: Array<RouteFeature>;
	public hexagon: Hexagon;
	private extractionPoint: ExtractionPoint;
	public includedBottlenecks: Array<BottleNeck>;
	public time: number;

	private shown: boolean = false;

	constructor(route: Array<RouteFeature>, hexagon: Hexagon, extractionPoint: ExtractionPoint, includedBottlenecks: Array<BottleNeck>, time: number) {
		this.route = route;
		this.hexagon = hexagon;
		this.extractionPoint = extractionPoint;
		this.includedBottlenecks = includedBottlenecks;
		this.time = time;
	}

	public destroy(): void {
		this.hexagon.evacuation = undefined;
	}

	private animate(): void {

	}
	
	public display(): void {
		if (this.shown) {
			return;
		}
		// display evacuation on map
	}

	public hide(): void {
		if (!this.shown) {
			return;
		}
		// hide evacuation on map
		this.shown = false;
	}

}
