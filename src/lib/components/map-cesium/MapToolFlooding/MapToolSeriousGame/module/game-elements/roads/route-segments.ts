import { get, writable, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { lineString, length, along } from '@turf/turf';
import gsap  from "gsap";
import type { Map as CesiumMap } from "$lib/components/map-cesium/module/map";
import type { RouteFeature } from "../api/routing-api";
import { CylinderGeometry } from "./cylinder-geometry";


export class RoadNetworkLayer {

	private map: CesiumMap;
	public segments: Array<RouteSegment> = [];
	private extractionPointIds: Array<string>;
	private polylinePrimitive?: Cesium.GroundPolylinePrimitive;
	private extractionPointPrimitive?: Cesium.Primitive;

	private elapsedTime: Writable<number>;
	private timeGaps: Readable<{ before?: number, after?: number }>;

	constructor(map: CesiumMap, elapsedTime: Writable<number>, timeGaps: Readable<{ before?: number, after?: number }>, extractionPointIds: Array<string>) {
		this.map = map;
		this.extractionPointIds = extractionPointIds;
		this.elapsedTime = elapsedTime;
		this.timeGaps = timeGaps;
	}

	public add(item: RouteFeature, updatePrimitive: boolean = true): RouteSegment {
		const isExtractionPoint = this.extractionPointIds.includes(item.properties.fid.toString());
		const routeSegment = new RouteSegment(item, this.elapsedTime, this.timeGaps, this.map, isExtractionPoint);
		this.segments.push(routeSegment);
		if (updatePrimitive) this.updatePrimitive();
		return routeSegment;
	}

	public remove(item: RouteSegment, updatePrimitive: boolean = true): void {
		this.segments = this.segments.filter((segment) => segment.id !== item.id);
		if (updatePrimitive) this.updatePrimitive();
	}

	public getItemById(id: string): RouteSegment | undefined {
		return this.segments.find((segment) => segment.id === id);
	}

	public getItemByWvkId(id: string): RouteSegment | undefined {
		return this.segments.find((segment) => segment.feature.properties.wvk_ids?.includes(parseInt(id)));
	}

	public updatePrimitive(): void {
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
			this.segments.forEach((segment) => segment.updateLoad());
			removeListener();
		});
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
			in vec2 st;
			in float batchId;

			in float isTop;

			out vec3 v_positionEC;
			out vec3 v_normalEC;
			out vec4 v_color;
			out vec2 v_st;

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
				v_st = st;

				gl_Position = czm_modelViewProjectionRelativeToEye * p;
			}
		`;
		const fragmentShader = `
			in vec3 v_positionEC;
			in vec3 v_normalEC;
			in vec2 v_st;
			in vec4 v_color;

			czm_material sdg_czm_getMaterial(czm_materialInput materialInput) {
				czm_material material = czm_getDefaultMaterial(materialInput);
				material.diffuse = czm_gammaCorrect(v_color.rgb * vec3(1.0));
				material.alpha = v_color.a;
				material.specular = 0.0;
				material.shininess = 0.0;
				return material;
			}

			void main() {
				vec3 positionToEyeEC = -v_positionEC;

				vec3 normalEC = normalize(v_normalEC);
			#ifdef FACE_FORWARD
				normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
			#endif

				czm_materialInput materialInput;
				materialInput.normalEC = normalEC;
				materialInput.positionToEyeEC = positionToEyeEC;
				materialInput.st = v_st;
				czm_material material = sdg_czm_getMaterial(materialInput);

			#ifdef FLAT
				out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
			#else
				out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
			#endif
			}
		`;
		const appearance = new Cesium.MaterialAppearance({
			material: new Cesium.Material({
				fabric: {
					type: "ExtractionPointMaterial"
				}
			}),
			vertexShaderSource: vertexShader,
			fragmentShaderSource: fragmentShader,
			translucent: true,
			closed: true
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
		name: string;
		maximum_snelheid: number;
		capaciteit: number;
		cost: number;
		source: string | number;
		target: string | number;
		wvk_ids: Array<number> | null;
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

	public capacityPerHour: number;
	public capacity: number; // Extraction capacity per time step
	public elapsedTime: Writable<number>;
	public loadPerTimeStep: Map<number, number> = new Map(); // Load per time step
	public isOverloaded: Writable<boolean> = writable(false);

	private map: CesiumMap;
	public lineInstance: RouteSegmentLineInstance;
	public extractionPoint: ExtractionPoint | undefined;
	private isActiveExtractionPoint: boolean = false;
	private displayedLoad: number = 0;
	public load: Writable<number> = writable(0);

	public raisedBy: number = 0;

	constructor(feature: IEdgeFeature, elapsedTime: Writable<number>, timeGaps: Readable<{ before?: number, after?: number }>, map: CesiumMap, isExtractionPoint: boolean) {
		const { lon , lat } = getMidpoint(feature.geometry.coordinates);
		super(feature.properties.fid.toString(), lon, lat, feature);
		this.capacityPerHour = feature.properties.capaciteit;
		this.capacity = this.capacityPerHour;
		this.elapsedTime = elapsedTime;
		this.map = map;
		this.lineInstance = new RouteSegmentLineInstance(this.feature.properties.fid, this.feature.geometry.coordinates);
		if (isExtractionPoint) {
			this.extractionPoint = new ExtractionPoint(this.map, this.feature.properties.fid.toString(), this.position, this.capacity);
		}
		elapsedTime.subscribe(() => this.updateLoad());
		timeGaps.subscribe((gaps) => {
			const timeAfter = gaps.after || 0;
			this.updateCapacity(timeAfter * this.capacityPerHour);
		});
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
		this.updateLoad();
	}

	public removeLoad(load: number, time: number = get(this.elapsedTime)): void {
		if (this.loadPerTimeStep.has(time)) {
			const currentLoad = this.loadPerTimeStep.get(time)!;
			const newLoad = Math.max(0, currentLoad - load);
			this.loadPerTimeStep.set(time, newLoad);
		}
		this.updateLoad();
	}

	public updateLoad(): void {
		const time = get(this.elapsedTime);
		this.isOverloaded.set(this.overloaded(time));
		const currentLoad = this.loadPerTimeStep.get(time) || 0;
		if (currentLoad !== this.displayedLoad) {
			gsap.to(this, {
				displayedLoad: currentLoad,
				duration: 2.5,
				onUpdate: () => this.setLoad(this.displayedLoad)
			});
		} else {
			this.setLoad(currentLoad);
		}
	}

	private setLoad(newLoad: number): void {
		this.lineInstance.update(newLoad, this.capacity);
		this.extractionPoint?.updateAttributes(newLoad, this.capacity);
		this.load.set(Math.round(newLoad));
		this.map.refresh();
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
		this.extractionPoint?.updateArrow(newCapacity);
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

	public flyTo(): void {
		if (!this.extractionPoint?.flyTo()) {
			const boundingSphere = Cesium.BoundingSphere.fromPoints(this.lineInstance.positions);
			this.map.viewer.camera.flyToBoundingSphere(boundingSphere);
		}
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
				const darkenedColor = this.darkenColor(this.color, 0.6);
				attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(darkenedColor, attributes.color);
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

	private darkenColor(color: Cesium.Color, factor: number): Cesium.Color {
		return new Cesium.Color(
			Cesium.Math.clamp(color.red * factor, 0, 1),
			Cesium.Math.clamp(color.green * factor, 0, 1),
			Cesium.Math.clamp(color.blue * factor, 0, 1),
			color.alpha
		);
	}
}



class ExtractionPoint {

	private geometryID: string;
	private position: Cesium.Cartesian3;
	public geometryInstances: Array<Cesium.GeometryInstance>;
	private selectArrow3D: [head: Cesium.Entity, shaft: Cesium.Entity];

	private map: CesiumMap;
	public parentPrimitive?: Cesium.Primitive;

	constructor(map: CesiumMap, routeSegmentID: string, position: Cesium.Cartesian3, capacity: number) {
		this.map = map;
		this.geometryID = `extraction-${routeSegmentID}`;
		this.position = position;
		this.geometryInstances = this.createGeometryInstances();
		this.selectArrow3D = this.createSelectArrow3D(capacity);
	}

	private createGeometryInstances(): Array<Cesium.GeometryInstance> {
		const cylinder = new Cesium.CylinderGeometry({
			length: 1,
			topRadius: 500,
			bottomRadius: 500
		});
		const geometry = CylinderGeometry.createGeometry(cylinder) as Cesium.Geometry;
		if (!geometry) {
			console.error("Failed to create geometry for BottleNeck");
			return [];
		}
		const vectorUp = Cesium.Cartesian3.normalize(this.position, new Cesium.Cartesian3());
		const bottom = new Cesium.GeometryInstance({
			geometry: geometry,
			modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(this.position),
			id: this.geometryID,
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
			id: this.geometryID + "-top",
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
			const attributesBottom = this.parentPrimitive?.getGeometryInstanceAttributes(this.geometryID);
			const attributesTop = this.parentPrimitive?.getGeometryInstanceAttributes(this.geometryID + "-top");
			attributesBottom.offsetBottom = [0];
			attributesBottom.offsetTop = [load];
			attributesTop.offsetBottom = [load];
			attributesTop.offsetTop = [capacity];
		}
	}

	public highlight(b: boolean): void {
		/* 	
		if (this.parentPrimitive?.ready) {
			const attributesBottom = this.parentPrimitive.getGeometryInstanceAttributes(this.geometryID);
			const attributesTop = this.parentPrimitive.getGeometryInstanceAttributes(this.geometryID + "-top");
			if (b) {
				attributesBottom.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.RED.withAlpha(1), attributesBottom.color);
				attributesTop.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.GREEN.withAlpha(1), attributesTop.color);
			} else {
				attributesBottom.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.RED.withAlpha(0.5), attributesBottom.color);
				attributesTop.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.GREEN.withAlpha(0.5), attributesTop.color);
			}
		}
		*/
		if (b && !this.map.viewer.entities.contains(this.selectArrow3D[0])) this.map.viewer.entities.add(this.selectArrow3D[0]);
		if (b && !this.map.viewer.entities.contains(this.selectArrow3D[1])) this.map.viewer.entities.add(this.selectArrow3D[1]);
		this.selectArrow3D[0].show = b;
		this.selectArrow3D[1].show = b;
	}

	public updateArrow(newCapacity: number): void {
		if (this.map.viewer.entities.contains(this.selectArrow3D[0])) this.map.viewer.entities.remove(this.selectArrow3D[0]);
		if (this.map.viewer.entities.contains(this.selectArrow3D[1])) this.map.viewer.entities.remove(this.selectArrow3D[1]);
		this.selectArrow3D = this.createSelectArrow3D(newCapacity);
	}

	private createSelectArrow3D(base: number): [head: Cesium.Entity, shaft: Cesium.Entity] {
		const shaftHeight = 1400;
		const shaftRadius = 200;
		const headHeight = 600;
		const headRadius = 500;

		const transform = Cesium.Transforms.eastNorthUpToFixedFrame(this.position);
		const verticalOffset = (upMeters: number) => {
			return Cesium.Matrix4.multiplyByPoint(
				transform,
				new Cesium.Cartesian3(0, 0, base + upMeters + 350),
				new Cesium.Cartesian3()
			);
		};

		const orientation = Cesium.Transforms.headingPitchRollQuaternion(
			this.position,
			new Cesium.HeadingPitchRoll(0, Math.PI, 0)
		);

		const head = new Cesium.Entity({
			cylinder: {
				length: headHeight,
				topRadius: 0,
				bottomRadius: headRadius,
				material: Cesium.Color.DODGERBLUE.withAlpha(1)
			},
			position: verticalOffset(headHeight / 2),
			orientation: orientation,
			show: false
		});
		const shaft = new Cesium.Entity({
			cylinder: {
				length: shaftHeight,
				topRadius: shaftRadius,
				bottomRadius: shaftRadius,
				material: Cesium.Color.DODGERBLUE.withAlpha(1)
			},
			position: verticalOffset(headHeight + shaftHeight / 2),
			orientation: orientation,
			show: false
		});
		this.map.viewer.entities.add(head);
		this.map.viewer.entities.add(shaft);

		return [head, shaft];
	}

	public flyTo(): void {
		const boundingSpheres = this.geometryInstances.map(instance => instance.geometry.boundingSphere);
		const boundingSphere = Cesium.BoundingSphere.fromBoundingSpheres(boundingSpheres);
		this.map.viewer.camera.flyToBoundingSphere(boundingSphere);
	}
}