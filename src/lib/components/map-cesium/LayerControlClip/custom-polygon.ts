//FINN TODO: Clean this up also copy clip.ts and cliphandler from map-cesium
import * as Cesium from "cesium";
import { writable, type Writable, type Unsubscriber, get } from "svelte/store";
import type { Map } from "../module/map";

// import type { Map } from "$lib/module/map";
// import type { BatchRepository } from "../batches/batch-repository";
// import type { SoilBatch } from "../batches/batch";
// import { Excavation } from "../batches/batch";
import { getCartesian2, c3ArrayToPolygon } from "./cartesian-helpers";

import arrowDownIcon from "$lib/files/icon-arrow-down.svg";
// import type { ExcavationFeature, RecursivePartial } from "../../models/datahub-models-copy";


export class CustomPolygon {
	// Handles
	private moveHandle = (m: any) => {
		this.drawPointMove(m);
	}
	private leftClickHandle = async(m: any) => {
		this.drawPoint(m);
		/*
		if (event === false) {
			this.warningInvalid.set(true);
		} else {
			this.warningInvalid.set(false);
		}
		*/
	}
	private rightClickHandle = (m: any): void  => {
		this.drawPoint(m);
		this.editing.set(false);
	}


	private map: Map;
	private repository: BatchRepository;
	private active: Writable<SoilBatch | undefined>;

	private dynamicPolygon!: Cesium.Entity;
	private movingPoint!: Cesium.Entity;
	private pointEntities: Array<Cesium.Entity>;
	public cartesianPoints: Writable<Array<Cesium.Cartesian3>>;
	private pointColor = Cesium.Color.DODGERBLUE;

	public editing!: Writable<boolean>;
	private editingUnsubscriber!: Unsubscriber;
	public warningInvalid = writable(false);

	constructor(map: Map, repository: BatchRepository, active: Writable<SoilBatch | undefined>) {
		this.map = map;
		this.repository = repository;
		this.active = active;
		this.pointEntities = new Array();
		this.cartesianPoints = writable(new Array());
		this.editing = writable(false)

		this.setup();
	}

	private setup() {
		this.editingUnsubscriber = this.editing.subscribe((b) => b ? this.start() : this.terminate());
	}

	onDestroy(): void {
		this.editingUnsubscriber();
		this.editing.set(false);
	}


	private start(): void {
		this.addStartEntities();
		this.addHandlers();
	}


	public terminate(): void {
		const newPoints = get(this.cartesianPoints);
		if (newPoints.length > 2) {
			const polygon = c3ArrayToPolygon(newPoints, true);
			const excavationFeature: RecursivePartial<ExcavationFeature> = {
				properties: {
					depth_bottom: 8,
					geom_feature: {
						geom: {
							type: "Polygon",
							coordinates: [polygon]
						}
					}
				}
			}
			const newExcavation = new Excavation(excavationFeature as ExcavationFeature, true);
			this.active.set(newExcavation);
			this.repository.excavationRepository.add(newExcavation);
			this.repository.excavationRepository.updateLocalStorage();
		}
		this.removePointEntities();
		this.removeHandlers();
	}



	private addHandlers(): void {
		this.map.on("mouseMove", this.moveHandle);
		this.map.on("mouseLeftClick", this.leftClickHandle);
		this.map.on("mouseRightClick", this.rightClickHandle);
	}

	private removeHandlers(): void {
		this.map.off("mouseMove", this.moveHandle);
		this.map.off("mouseLeftClick", this.leftClickHandle);
		this.map.off("mouseRightClick", this.rightClickHandle);
	}



	private addStartEntities(): void {
		this.movingPoint = this.map.viewer.entities.add({
			position: new Cesium.Cartesian3(),
			billboard: {
				image: arrowDownIcon,
				pixelOffset: new Cesium.Cartesian2(0, -26),
			}
		});
		/*this.movingPoint = this.map.viewer.entities.add({
			cylinder: {
				length: 20,
				topRadius: 3,
				bottomRadius: 0,
				material: this.pointColor.withAlpha(0.7),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
			}
		});*/
		this.dynamicPolygon = this.map.viewer.entities.add({
			polygon: {
				material: Cesium.Color.BLUE.withAlpha(0.2)
			}
		});
	}
	
	private drawPointMove(m: any): void {
		const location = getCartesian2(m);
		const picked = this.map.viewer.scene.pickPosition(location);
		this.movingPoint.position = new Cesium.ConstantPositionProperty(picked);
		this.map.refresh();
	}

	public async drawPoint(m: any): Promise<void> {
		const location = getCartesian2(m);
		let pickedPosition = this.map.viewer.scene.pickPosition(location);
		const currentPoints = get(this.cartesianPoints);

		// Prevent adding duplicate points when double clicking:
		for (let i = 0; i < currentPoints.length; i++) {
			if (Cesium.Cartesian3.equals(currentPoints[i], pickedPosition)) {
				return;
			}
		}

		/*
		if (!validPointCheck(currentPoints, pickedPosition, 1.5)) {
			return false; 
		}
		*/

		this.cartesianPoints.set([...currentPoints, pickedPosition]);
		this.updatePolygon(pickedPosition);

		// Start drawing polygon after 2 points are added
		/*if (get(this.cartesianPoints).length === 2 && this.dynamicPolygon.polygon) {
			this.dynamicPolygon.polygon.hierarchy = new Cesium.CallbackProperty(() => { 
				return {
					positions: this.getPolygonPositions(),
				}
			}, false)
		}*/ // --> worsens movingPoint animation, and leads to crash sometimes: RangeError: Maximum call stack size exceeded

		this.addCornerEntity(pickedPosition);
		if (this.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
			let locationClampedToTerrain = await Cesium.sampleTerrainMostDetailed(this.map.viewer.terrainProvider, [Cesium.Cartographic.fromCartesian(pickedPosition)]);
			pickedPosition = Cesium.Cartographic.toCartesian(locationClampedToTerrain[0]);
		}
	}

	private addCornerEntity(location: Cesium.Cartesian3): void {
		const point = this.map.viewer.entities.add({
			position: location,
			point: {
				color: this.pointColor,
				pixelSize: 5,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 1,
				disableDepthTestDistance: new Cesium.ConstantProperty(Number.POSITIVE_INFINITY),
				//distanceDisplayCondition: new Cesium.DistanceDisplayCondition(1050, Number.MAX_VALUE)
			}
		});
		/*const cylinder = this.map.viewer.entities.add({
			position: location,
			cylinder: {
				length: 8,
				topRadius: 0.75,
				bottomRadius: 0,
				material: this.pointColor.withAlpha(0.4),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000)
			}
		});*/
		this.pointEntities.push(point);
		//this.pointEntities.push(cylinder);
	}

	private getPolygonPositions(): Array<Cesium.Cartesian3> {
		const positions = get(this.cartesianPoints);
		//@ts-ignore
		const positionMovingPoint = this.movingPoint.position?._value;
		if (positionMovingPoint && this.dynamicPolygon.polygon) {
			return [...positions, positionMovingPoint];
		}
		else return []
		//else return this.dynamicPolygon.polygon?.hierarchy?.getValue(this.map.viewer.clock.currentTime).positions;
	}

	
	private updatePolygon(pt: Cesium.Cartesian3): void {
		const positions = get(this.cartesianPoints);
		const newPositions = [...positions, pt];
		if (newPositions.length < 2 || !this.dynamicPolygon.polygon) return;
		this.dynamicPolygon.polygon.hierarchy = new Cesium.ConstantProperty(new Cesium.PolygonHierarchy(newPositions, []));
	}
	

	private removePointEntities(): void {
		if (this.movingPoint) this.map.viewer.entities.remove(this.movingPoint);
		if (this.dynamicPolygon) this.map.viewer.entities.remove(this.dynamicPolygon);
		for (let i = 0; i < this.pointEntities.length; i++) {
			this.map.viewer.entities.remove(this.pointEntities[i]);
		}
		this.pointEntities = new Array();
		this.cartesianPoints.set(new Array());
	}
}