import type { Writable } from "svelte/store";
import { HexagonLayer, type Hexagon } from "./hexagon";
import { RoadNetwork } from "./road-network";
import { notifications } from "$lib/components/map-core/notifications/notifications";



export class EvacuationController {

	private elapsedTime: Writable<number>;
	public roadNetwork: RoadNetwork;
	public hexagonLayer: HexagonLayer;

	get hexagons(): Array<Hexagon> {
		return this.hexagonLayer.hexagons;
	}
	
	constructor(scenario: string, elapsedTime: Writable<number>) {
		this.roadNetwork = new RoadNetwork();
		this.hexagonLayer = new HexagonLayer(scenario);
		this.elapsedTime = elapsedTime;
		this.elapsedTime.subscribe((time: number) => {
			this.hexagons.forEach((hex: Hexagon) => hex.timeUpdated(time));
		});
	}

	public evacuate(): void {
		const destination = this.roadNetwork.selectedExtractionPoint;
		for (const hex of this.hexagons) {
			const evacuation = this.roadNetwork.createEvacuation(hex, destination);
			if (!evacuation) {
				//notifications.dispatch( ERROR )
			}
		}
	}

	public cancelEvacuation(hexagon: Hexagon): void {
		if (hexagon.evacuation) {
			this.roadNetwork.removeEvacuation(hexagon.evacuation);
			hexagon.evacuation = undefined;
		}
	}

}
