import type { BottleNeck, ExtractionPoint } from "./bottle-neck";
import type { Hexagon } from "./hexagon";


export class Evacuation {

	private route: Array<number>;
	private hexagon: Hexagon;
	private extractionPoint: ExtractionPoint;
	private includedBottlenecks: Array<BottleNeck> = [];
	private step: number = 0;

	constructor(route: Array<number>, hexagon: Hexagon, extractionPoint: ExtractionPoint) {
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
