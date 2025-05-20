import * as Cesium from "cesium";


class RoutingNode {

	public id: string;
	public position: Cesium.Cartesian3;
	public entity: Cesium.Entity;

	constructor(id: string, position: Cesium.Cartesian3) {
		this.id = id;
		this.position = position;
		this.entity = this.createEntity();
	}

	private createEntity(): Cesium.Entity {
		return new Cesium.Entity({
			name: "Routing Node",
			position: this.position,
			point: {
				color: Cesium.Color.BLUE,
				pixelSize: 10
			}
		});
	}
}


export class ExtractionPoint extends RoutingNode {

	public totalExtracted: number = 0;

	constructor(id: string, position: Cesium.Cartesian3) {
		super(id, position);
	}
}



export interface IMeasure {
	name: string;
	impact: any;
}


export class BottleNeck extends RoutingNode {

	public measures: Array<IMeasure> = [];
	public capacity: number; // Extraction capacity per time step
	public currentLoad: number = 0;

	constructor(id: string, position: Cesium.Cartesian3, capacity: number) {
		super(id, position);
		this.capacity = capacity;
	}

}




export class BottleNeckLayer {

	private dataSource: Cesium.CustomDataSource;

	constructor() {
		this.dataSource = new Cesium.CustomDataSource("bottlenecks");
	}

	public addBottleneck(bottleneck: BottleNeck): void {
		this.dataSource.entities.add(bottleneck.entity);
	}

	public removeBottleneck(bottleneck: BottleNeck): void {
		this.dataSource.entities.remove(bottleneck.entity);
	}

}

