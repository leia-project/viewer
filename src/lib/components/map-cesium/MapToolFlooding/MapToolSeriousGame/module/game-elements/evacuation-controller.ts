import { get, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Hexagon } from "./hexagons/hexagon";
import { HexagonLayer } from "./hexagons/hexagon-layer";
import { RoadNetwork } from "./roads/road-network";
import { notifications } from "$lib/components/map-core/notifications/notifications";
import { Map } from "$lib/components/map-cesium/module/map";



export class EvacuationController {

	private map: Map;
	private elapsedTime: Writable<number>;
	public roadNetwork: RoadNetwork;
	public hexagonLayer: HexagonLayer;

	get hexagons(): Array<Hexagon> {
		return this.hexagonLayer.hexagons;
	}
	
	constructor(map: Map, scenario: string, elapsedTime: Writable<number>, outline: {type: string, coordinates: Array<Array<[lon: number, lat: number]>>}) {
		this.map = map;
		this.roadNetwork = new RoadNetwork(map);
		this.hexagonLayer = new HexagonLayer(map, scenario, outline);
		this.elapsedTime = elapsedTime;
		this.elapsedTime.subscribe((time: number) => {
			this.hexagons.forEach((hex: Hexagon) => hex.timeUpdated(time));
		});
	}

	public evacuateAll(): void {
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

	
/* 	private addEvents(): void {
		// make hexagons selectable
		this.map.on("mouseLeftClick", this.leftClickHandle);
	}

	private getObjectFromMouseLocation(m: any): F | undefined {
		const location = getCartesian2(m);
		if (!location) return undefined;
		const picked = this.map.viewer.scene.pick(location);
		if (picked?.id?.billboard !== undefined) {
			const billboard = picked.id.billboard as Cesium.BillboardGraphics;
			for (const icon of this.mapIcons) {
				if (billboard === icon.billboard.billboard) {
					return icon.feature;
				}
			}
			return undefined;
		}
	}

	private moveHandle = (m: any) => {
		const obj = this.getObjectFromMouseLocation(m);
		if (obj !== get(this.hoveredFeature)) this.hoveredFeature.set(obj);
		this.map.container.style.cursor = obj ? "pointer" : "default";
	}
	private leftClickHandle = (m: any) => {
		const obj = this.getObjectFromMouseLocation(m);
		if (obj !== get(this.activeFeature) && obj !== undefined) this.activeFeature.set(obj);
	}

	private addMouseEvents(): void {
		this.map.on("mouseLeftClick", this.leftClickHandle);
		this.map.on("mouseMove", this.moveHandle);
	}
	private removeMouseEvents(): void {
		this.map.off("mouseLeftClick", this.leftClickHandle);
		this.map.off("mouseMove", this.moveHandle);
	}
 */
}
