import * as Cesium from "cesium";
import type { Map } from "../module/map";
import { MapMeasurement } from "../module/map-measurement";


export class MapMeasurementFloodDepth extends MapMeasurement {

	constructor(id: number, map: Map) {
		super(id, map);

		this.helpLineColor = Cesium.Color.AQUA;
		this.pointFill = Cesium.Color.BLUE;
		this.lineColor = Cesium.Color.BLUE;
	}

	addPointEntity(location: Cesium.Cartesian3, index: number): void {
		const entity = this.map.viewer.entities.add({
			position: location,
			point: {
				show: true,
				color: this.pointFill,
				pixelSize: 10,
				outlineColor: this.pointOutline,
				outlineWidth: 1
			}
		});
		this.pointEntities.push(entity);    
	}

}