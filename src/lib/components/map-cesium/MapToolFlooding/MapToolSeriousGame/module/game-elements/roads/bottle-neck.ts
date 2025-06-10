import { writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import gsap from "gsap";
import type { Map } from "$lib/components/map-cesium/module/map";
import { CylinderGeometry } from "./cylinder-geometry";



abstract class RoutingNode {

	public id: string;
	public lon: number;
	public lat: number;
	public position: Cesium.Cartesian3;
	public entity: Cesium.Entity;

	constructor(id: string, lon: number, lat: number) {
		this.id = id;
		this.lon = lon;
		this.lat = lat;
		this.position = Cesium.Cartesian3.fromDegrees(lon, lat);
		this.entity = this.createEntity();
	}

	protected abstract createEntity(): Cesium.Entity;
}


export class ExtractionPoint extends RoutingNode {

	public totalExtracted: number = 0;

	constructor(id: string, lon: number, lat: number) {
		super(id, lon, lat);
	}

	protected createEntity(): Cesium.Entity {
		return new Cesium.Entity({
			id: this.id + "_cone",
			position: this.position,
			cylinder: {
				length: 3500,
				topRadius: 1000,
				bottomRadius: 10,
				material: Cesium.Color.GREEN.withAlpha(0.7),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
			}
		});
	}
}



export interface IMeasure {
	name: string;
	impact: any;
}


export class BottleNeck extends RoutingNode {

	public measures: Array<IMeasure> = [];
	public capacity: number; // Extraction capacity per time step
	public currentLoad: number = 2000;
	public geometryInstances: Array<Cesium.GeometryInstance>;

	public parentPrimitive?: Cesium.Primitive;
	public map?: Map;

	constructor(id: string, lon: number, lat: number, capacity: number) {
		super(id, lon, lat);
		this.capacity = capacity;
		this.geometryInstances = this.createGeometryInstance();
		setInterval(() => {
			this.updateLoad(Math.random() * this.capacity);
		}, 2000);
	}

	protected createEntity(): Cesium.Entity {
		// Create a cylinder which fills up as the capacity is being used up
		return new Cesium.Entity({
			id: this.id,
			position: this.position,
			billboard: {
				image: "/images/Geodan_logo.png",
				scale: 0.12,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		});
	}

	private createGeometryInstance(): Array<Cesium.GeometryInstance> {
		const cylinder = new Cesium.CylinderGeometry({
			length: 10,
			topRadius: 500,
			bottomRadius: 500,
		});
		const geometry = CylinderGeometry.createGeometry(cylinder) as Cesium.Geometry;
		if (!geometry) {
			console.error("Failed to create geometry for BottleNeck");
		}
		const vectorUp = Cesium.Cartesian3.normalize(this.position, new Cesium.Cartesian3());
		const bottom = new Cesium.GeometryInstance({
			geometry: geometry,
			modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(this.position),
			id: this.id,
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED.withAlpha(0.5)),
				offsetBottom: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [0]
				}),
				offsetTop: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [this.currentLoad]
				}),
				vectorUp: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 3,
					value: [vectorUp.x, vectorUp.y, vectorUp.z]
				})
			}
		});
		const top = new Cesium.GeometryInstance({
			geometry: geometry,
			modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(this.position),
			id: this.id + "_top",
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN.withAlpha(0.5)),
				offsetBottom: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [this.currentLoad]
				}),
				offsetTop: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [this.capacity]
				}),
				vectorUp: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 3,
					value: [vectorUp.x, vectorUp.y, vectorUp.z]
				})
			}
		});
		return [bottom, top];
	}

	public updateCapacity(newCapacity: number): void {
		gsap.to(this, {
			capacity: newCapacity,
			duration: 0.7,
			onUpdate: () => this.updateAttributes()
		});
	}

	public updateLoad(newLoad: number): void {
		gsap.to(this, {
			currentLoad: newLoad,
			duration: 0.7,
			onUpdate: () => this.updateAttributes()
		});
	}

	private updateAttributes(): void {
		if (this.parentPrimitive) {
			const attributesBottom = this.parentPrimitive?.getGeometryInstanceAttributes(this.id);
			const attributesTop = this.parentPrimitive?.getGeometryInstanceAttributes(this.id + "_top");
			attributesBottom.offsetBottom = [0];
			attributesBottom.offsetTop = [this.currentLoad];
			attributesTop.offsetBottom = [this.currentLoad];
			attributesTop.offsetTop = [this.capacity];
			this.map?.refresh();
		}
	}

	// info popup:
	// display the capacity evolution through time

}



export class RoadNetworkLayer<T extends RoutingNode> {

	private map: Map;
	private dataSource: Cesium.CustomDataSource;
	private items: Array<T> = [];

	//private infobox: InfoBox | undefined;
	private hovered: Writable<T | undefined> = writable(undefined);

	public infoboxTimeOut: NodeJS.Timeout  | undefined;

	constructor(map: Map) {
		this.map = map;
		this.dataSource = new Cesium.CustomDataSource();
		this.map.viewer.dataSources.add(this.dataSource);
	}

	public add(bottleneck: T): void {
		this.dataSource.entities.add(bottleneck.entity);
		this.items.push(bottleneck);
	}

	public remove(bottleneck: T): void {
		this.dataSource.entities.remove(bottleneck.entity);
		this.items = this.items.filter((item) => item.id !== bottleneck.id);
	}

	public clear(): void {
		this.map.viewer.dataSources.remove(this.dataSource);
	}

}



export class RoadNetworkLayerP<T extends BottleNeck> {

	private map: Map;
	private primitive?: Cesium.Primitive;
	private items: Array<T> = [];
	private timeout: NodeJS.Timeout | undefined;

	//private infobox: InfoBox | undefined;
	private hovered: Writable<T | undefined> = writable(undefined);

	public infoboxTimeOut: NodeJS.Timeout  | undefined;

	constructor(map: Map) {
		this.map = map;
	}

	
	private createPrimitive(): Cesium.Primitive {
		const geometryInstances = this.items.map((b) => b.geometryInstances).flat();
		const vertexShader = `
			in vec3 position3DHigh;
			in vec3 position3DLow;
			in vec3 normal;
			in vec4 color;
			in float batchId;

			in float isTop;
			in vec3 vectorUp;

			out vec3 v_positionEC;
			out vec3 v_normalEC;
			out vec4 v_color;

			void main() {
				vec4 p = czm_computePosition();

				float offsetBottom = czm_batchTable_offsetBottom(batchId);
				float offsetTop = czm_batchTable_offsetTop(batchId);
				vec3 vectorUp = czm_batchTable_vectorUp(batchId);

				if (isTop > 0.0) {
					p += vec4(vectorUp * offsetTop, 0.0);
				} else {
				 	p += vec4(vectorUp * offsetBottom, 0.0);
				}

				v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
				v_normalEC = czm_normal * normal;                         // normal in eye coordinates
				v_color = color;

				gl_Position = czm_modelViewProjectionRelativeToEye * p;
			}
		`
		const appearance = new Cesium.PerInstanceColorAppearance({
			translucent: true,
			closed: true,
			vertexShaderSource: vertexShader,
			renderState: {
				// Fix the vertical flickering lights here?
			}
		});
		return new Cesium.Primitive({
			geometryInstances: geometryInstances,
			appearance: appearance,
			asynchronous: false
		});
	}

	private updatePrimitive(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.timeout = setTimeout(() => {
			if (this.primitive) {
				this.map.viewer.scene.primitives.remove(this.primitive);
			}
			this.primitive = this.createPrimitive();
			this.map.viewer.scene.primitives.add(this.primitive);
			this.items.forEach((bottleneck) => {
				bottleneck.parentPrimitive = this.primitive;
				bottleneck.map = this.map;
			});
		}, 10);
	}

	public add(bottleneck: T): void {
		this.items.push(bottleneck);
		this.updatePrimitive();
	}

	public remove(bottleneck: T): void {
		this.items = this.items.filter((item) => item !== bottleneck);
		this.updatePrimitive();
	}

	public clear(): void {
		this.map.viewer.scene.primitives.remove(this.primitive);
		this.items = [];
	}

}
