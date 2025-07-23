import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { lineString, length, along } from '@turf/turf';
import gsap  from "gsap";
import type { Map as CesiumMap } from "$lib/components/map-cesium/module/map";
import type { RouteFeature } from "../api/routing-api";
import { CylinderGeometry } from "./cylinder-geometry";


export class RoadNetworkLayer {

	private map: CesiumMap;
	private dataSource: Cesium.CustomDataSource;
	public segments: Array<RouteSegment> = [];
	private extractionPointIds: Array<string>;
	private polylinePrimitive?: Cesium.GroundPolylinePrimitive;
	private extractionPointPrimitive?: Cesium.Primitive;
	private elapsedTime: Writable<number>;
	private timeout: NodeJS.Timeout | undefined;

	constructor(map: CesiumMap, elapsedTime: Writable<number>, extractionPointIds: Array<string>) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.extractionPointIds = extractionPointIds;
		this.dataSource = new Cesium.CustomDataSource();
		this.map.viewer.dataSources.add(this.dataSource);
	}

	public add(item: RouteFeature): RouteSegment {
		const isExtractionPoint = this.extractionPointIds.includes(item.properties.fid.toString());
		const routeSegment = new RouteSegment(item, this.elapsedTime, this.dataSource, this.map, isExtractionPoint);
		this.segments.push(routeSegment);
		this.updatePrimitive();
		return routeSegment;
	}

	public remove(item: RouteSegment): void {
		this.segments = this.segments.filter((segment) => segment.id !== item.id);
		this.updatePrimitive();
	}

	public clear(): void {
		this.map.viewer.dataSources.remove(this.dataSource);
	}

	public getItemById(id: string): RouteSegment | undefined {
		return this.segments.find((segment) => segment.id === id);
	}

	private updatePrimitive(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.timeout = setTimeout(() => {
			if (this.extractionPointPrimitive) {
				this.map.viewer.scene.primitives.remove(this.extractionPointPrimitive);
			}
			if (this.polylinePrimitive) {
				this.map.viewer.scene.primitives.remove(this.polylinePrimitive);
			}
			this.polylinePrimitive = this.createGroundPolylinePrimitive();
			this.extractionPointPrimitive = this.createExtractionPointPrimitive();
			this.map.viewer.scene.primitives.add(this.polylinePrimitive);
			this.map.viewer.scene.primitives.add(this.extractionPointPrimitive);

			this.segments.forEach((segment) => {
				segment.lineInstance.parentPrimitive = this.polylinePrimitive;
				if (segment.extractionPoint) {
					segment.extractionPoint.parentPrimitive = this.extractionPointPrimitive;
				}
			});
			const removeListener = this.map.viewer.scene.postRender.addEventListener(() => {
				if (!this.polylinePrimitive?.ready || !this.extractionPointPrimitive?.ready) {
					return;
				}
				this.segments.forEach((segment) => segment.updateVisualization());
				removeListener();
			});
		}, 10);
	}

	private createGroundPolylinePrimitive(): Cesium.GroundPolylinePrimitive {
		const geometryInstances = this.segments.map((segment) => segment.lineInstance.geometryInstance).filter((instance) => !!instance);
		const groundPolylinePrimitive = new Cesium.GroundPolylinePrimitive({
			geometryInstances: geometryInstances,
			appearance: new Cesium.PolylineColorAppearance({
				translucent: false
			}),
			allowPicking: true,
			asynchronous: false
		});
		return groundPolylinePrimitive;
	}

	private createExtractionPointPrimitive(): Cesium.Primitive {
		const geometryInstances = this.segments.map(b => b.extractionPoint?.geometryInstances).flat().filter(b => !!b);
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
}


export interface IEdgeFeature {
	type: "Feature";
	geometry: {
		type: "LineString";
		coordinates: Array<[lon: number, lat: number]>;
	};
	properties: {
		fid: string;
		maximum_snelheid: number;
		capaciteit: number;
		cost: number;
		source: string | number;
		target: string | number;
	};
}


abstract class RoutingNode<F = any> {

	public id: string;
	public lon: number;
	public lat: number;
	public feature: F;
	public position: Cesium.Cartesian3;
	//public entity: Cesium.Entity;

	constructor(id: string, lon: number, lat: number, feature?: F) {
		this.id = id;
		this.lon = lon;
		this.lat = lat;
		this.feature = feature || {} as F;
		this.position = Cesium.Cartesian3.fromDegrees(lon, lat);
		//this.entity = this.createEntity();
	}

	protected abstract createEntity(): Cesium.Entity;
	
	get centerCartesian3(): Cesium.Cartesian3 {
		return this.position;
	}

}


function getMidpoint(coords: Array<[lon: number, lat: number]>): { lon: number, lat: number } {
	const line = lineString(coords);
	const totalLength = length(line, { units: 'kilometers' });
	const midpoint = along(line, totalLength / 2, { units: 'kilometers' });
	const position = midpoint.geometry.coordinates;
	return { lon: position[0], lat: position[1] };
}


export class RouteSegment extends RoutingNode<IEdgeFeature> {

	public capacity: number; // Extraction capacity per time step
	public elapsedTime: Writable<number>;
	public loadPerTimeStep: Map<number, number> = new Map(); // Load per time step
	public isOverloaded: Writable<boolean> = writable(false);

	private map: CesiumMap;
	public lineInstance: RouteSegmentLineInstance;
	public extractionPoint: ExtractionPoint | undefined;
	private isActiveExtractionPoint: boolean = false;
	private displayedLoad: number = 0;

	public raisedBy: number = 0;

	constructor(feature: IEdgeFeature, elapsedTime: Writable<number>, dataSource: Cesium.CustomDataSource, map: CesiumMap, isExtractionPoint: boolean) {
		const { lon , lat } = getMidpoint(feature.geometry.coordinates);
		super(feature.properties.fid.toString(), lon, lat, feature);
		this.capacity = feature.properties.capaciteit;
		this.elapsedTime = elapsedTime;
		this.map = map;
		this.lineInstance = new RouteSegmentLineInstance(this.feature.properties.fid, this.feature.geometry.coordinates);
		if (isExtractionPoint) {
			this.extractionPoint = new ExtractionPoint(this.feature.properties.fid.toString(), this.position);
		}
		elapsedTime.subscribe((t) => this.updateVisualization());
	}

	protected createEntity(): Cesium.Entity {
		const cartesians = this.feature.geometry.coordinates.map((coord) => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));
		return new Cesium.Entity({
			id: this.id,
			polyline: {
				positions: cartesians,
				width: 15,
				material: Cesium.Color.ORANGE.withAlpha(0.5),
				clampToGround: true
			}
		});
	}

	public get availableLoad(): number {
		return this.capacity - (this.loadPerTimeStep.get(get(this.elapsedTime)) || 0);
	}

	public overloaded(time: number = get(this.elapsedTime)): boolean {
		return (this.loadPerTimeStep.get(time) || 0) > this.capacity;
	}

	public addLoad(load: number, time: number = get(this.elapsedTime)): void {
		if (this.loadPerTimeStep.has(time)) {
			this.loadPerTimeStep.set(time, this.loadPerTimeStep.get(time)! + load);
		} else {
			this.loadPerTimeStep.set(time, load);
		}
		this.updateVisualization();
	}

	public removeLoad(load: number, time: number = get(this.elapsedTime)): void {
		if (this.loadPerTimeStep.has(time)) {
			const currentLoad = this.loadPerTimeStep.get(time)!;
			const newLoad = Math.max(0, currentLoad - load);
			this.loadPerTimeStep.set(time, newLoad);
		}
		this.updateVisualization();
	}

	public updateVisualization(): void {
		const time = get(this.elapsedTime);
		this.isOverloaded.set(this.overloaded(time));
		const currentLoad = this.loadPerTimeStep.get(time) || 0;
		if (currentLoad !== this.displayedLoad) {
			gsap.to(this, {
				displayedLoad: currentLoad,
				duration: 1.5,
				onUpdate: () => {
					this.lineInstance.update(currentLoad, this.capacity);
					this.extractionPoint?.updateAttributes(currentLoad, this.capacity);
					this.map.refresh();
				}
			});
		} else {
			this.lineInstance.update(currentLoad, this.capacity);
			this.extractionPoint?.updateAttributes(currentLoad, this.capacity);
			this.map.refresh();
		}
	}

	public updateCapacity(newCapacity: number): void {
		gsap.to(this, {
			capacity: newCapacity,
			duration: 0.7,
			onUpdate: () => {
				this.lineInstance.update(this.displayedLoad, this.capacity);
				this.extractionPoint?.updateAttributes(this.displayedLoad, this.capacity);
				this.map.refresh();
			}
		});
	}

	public highlight(b: boolean): void {
		if (this.isActiveExtractionPoint) b = true;
		this.lineInstance.highlight(b);
		this.extractionPoint?.highlight(b);
	}

	set activeExtractionPoint(active: boolean) {
		this.isActiveExtractionPoint = active;
		this.highlight(active);
	}
}


export class RouteSegmentLineInstance {
	
	public id: string;
	private lineInstanceID: string;
	public positions: Array<Cesium.Cartesian3>;
	public geometryInstance: Cesium.GeometryInstance;
	public parentPrimitive?: Cesium.GroundPolylinePrimitive;
	private color: Cesium.Color = Cesium.Color.GRAY.withAlpha(0.5);

	constructor(routeSegmentID: string, cartoPositions: Array<[lon: number, lat: number]>) {
		this.id = routeSegmentID;
		this.lineInstanceID = `segment-${routeSegmentID}`;
		this.positions = cartoPositions.map((coord) => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));
		this.geometryInstance = this.createGeometryInstance(this.lineInstanceID, this.color, 12);
	}

	public createGeometryInstance(id: string, color: Cesium.Color, width: number): Cesium.GeometryInstance {
		const geometryInstance = new Cesium.GeometryInstance({
			id: id,
			geometry: new Cesium.GroundPolylineGeometry({
				positions: this.positions,
				width: width
			}),
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
				show: new Cesium.ShowGeometryInstanceAttribute(false)
			}
		});
		return geometryInstance;
	}

	public update(load: number, capacity: number): void {
		if (this.parentPrimitive?.ready) {
			const attributes = this.parentPrimitive.getGeometryInstanceAttributes(this.lineInstanceID);
			this.color = this.getColor(load, capacity);
			if (attributes) {
				attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(this.color, attributes.color);
				attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(load > 0, attributes.show);
			}
		}
	}

	public highlight(b: boolean): void {
		if (this.parentPrimitive?.ready) {
			const attributes = this.parentPrimitive.getGeometryInstanceAttributes(this.lineInstanceID);
			if (b) {
				attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.HOTPINK.withAlpha(0.8), attributes.color);
			} else {
				attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(this.color, attributes.color);
			}
		}
	}

	private getColor(load: number, capacity: number): Cesium.Color {
		const loadRatio = load / capacity;
		if (loadRatio < 0.5) {
			return Cesium.Color.GREEN.withAlpha(1);
		} else if (loadRatio < 1) {
			return Cesium.Color.YELLOW.withAlpha(1);
		} else {
			return Cesium.Color.RED.withAlpha(1);
		}
	}

}



class ExtractionPoint {

	private routeSegmentID: string;
	private position: Cesium.Cartesian3;
	public geometryInstances: Array<Cesium.GeometryInstance>;

	public parentPrimitive?: Cesium.Primitive;

	constructor(routeSegmentID: string, position: Cesium.Cartesian3) {
		this.routeSegmentID = routeSegmentID;
		this.position = position;
		this.geometryInstances = this.createGeometryInstances();
	}

	private createGeometryInstances(): Array<Cesium.GeometryInstance> {
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
			id: this.routeSegmentID,
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
					value: [1] // Current load
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
			id: this.routeSegmentID + "-top",
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.GREEN.withAlpha(0.5)),
				offsetBottom: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [1] // Current load
				}),
				offsetTop: new Cesium.GeometryInstanceAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 1,
					value: [2] // Total capacity
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

	public updateAttributes(load: number, capacity: number): void {
		if (this.parentPrimitive?.ready) {
			const attributesBottom = this.parentPrimitive?.getGeometryInstanceAttributes(this.routeSegmentID);
			const attributesTop = this.parentPrimitive?.getGeometryInstanceAttributes(this.routeSegmentID + "-top");
			attributesBottom.offsetBottom = [0];
			attributesBottom.offsetTop = [load];
			attributesTop.offsetBottom = [load];
			attributesTop.offsetTop = [capacity];
		}
	}

	public highlight(b: boolean): void {
		if (this.parentPrimitive?.ready) {
			const attributesBottom = this.parentPrimitive.getGeometryInstanceAttributes(this.routeSegmentID);
			const attributesTop = this.parentPrimitive.getGeometryInstanceAttributes(this.routeSegmentID + "-top");
			if (b) {
				attributesBottom.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.RED.withAlpha(1), attributesBottom.color);
				attributesTop.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.GREEN.withAlpha(1), attributesTop.color);
			} else {
				attributesBottom.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.RED.withAlpha(0.5), attributesBottom.color);
				attributesTop.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.GREEN.withAlpha(0.5), attributesTop.color);
			}
		}
	}

}