import type { Map } from "$lib/components/map-cesium/module/map";
import * as Cesium from "cesium";

export interface ChinookIntersectData {
	heading: number,
	speed: number,
	intersectionPoint: Cesium.Cartesian3,
	intersectionTime: Cesium.JulianDate,
	startTime: Cesium.JulianDate,
	stopTime: Cesium.JulianDate
}

export class ChinookIntersect {

	private map: Map;
	private entity: Cesium.Entity;

	constructor(
		map: Map,
		data: ChinookIntersectData,
		offset?: { x: number, y: number, z: number }
	) {
		this.map = map;
		const { heading, speed, intersectionTime, startTime, stopTime } = data;
		let { intersectionPoint } = data;
		if (offset) {
			intersectionPoint = this.applyOffset(intersectionPoint, offset);
		}

		const timeToPassing = Cesium.JulianDate.secondsDifference(intersectionTime, startTime);
		const timeAfterPassing = Cesium.JulianDate.secondsDifference(stopTime, intersectionTime);
		
		const speedMetersPerSecond = speed / 3.6; // Convert km/h to m/s
		const distanceBefore = speedMetersPerSecond * timeToPassing;
		const distanceAfter = speedMetersPerSecond * timeAfterPassing;
		
		const headingRadians = Cesium.Math.toRadians(heading);
		const dirX = Math.sin(headingRadians);
		const dirY = Math.cos(headingRadians);
		const directionLocal = new Cesium.Cartesian3(dirX, dirY, 0);
		
		const transform = Cesium.Transforms.eastNorthUpToFixedFrame(intersectionPoint);
		const directionWorld = Cesium.Matrix4.multiplyByPointAsVector(
			transform, 
			directionLocal, 
			new Cesium.Cartesian3()
		);
		Cesium.Cartesian3.normalize(directionWorld, directionWorld);
		
		const startPosition = Cesium.Cartesian3.add(
			intersectionPoint,
			Cesium.Cartesian3.multiplyByScalar(
				directionWorld, 
				-distanceBefore, 
				new Cesium.Cartesian3()
			),
			new Cesium.Cartesian3()
		);
		
		const endPosition = Cesium.Cartesian3.add(
			intersectionPoint,
			Cesium.Cartesian3.multiplyByScalar(
				directionWorld, 
				distanceAfter, 
				new Cesium.Cartesian3()
			),
			new Cesium.Cartesian3()
		);
		
		// Create position property
		const position = new Cesium.SampledPositionProperty();
		position.addSample(startTime, startPosition);
		position.addSample(stopTime, endPosition);
		
		// Create orientation for the chinook model
		// The +0.5*PI rotates the model to align with the flight path
		const modelHeading = headingRadians + 0.5 * Math.PI;
		const hpr = new Cesium.HeadingPitchRoll(modelHeading, 0, 0);
		const orientation = Cesium.Transforms.headingPitchRollQuaternion(intersectionPoint, hpr);
		
		// Create the entity
		this.entity = this.map.viewer.entities.add({
			name: 'Chinook',
			position: position,
			orientation: new Cesium.ConstantProperty(orientation),
			model: {
				uri: "/models/ChinookMetLoopAnimatie.glb",
				scale: 2.0,
				minimumPixelSize: 0,
				runAnimations: true
			}
		});
	}

	private applyOffset(position: Cesium.Cartesian3, offset: { x: number, y: number, z: number }): Cesium.Cartesian3 {
		// Apply offset in local ENU frame
		const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
		const offsetLocal = new Cesium.Cartesian3(offset.x, offset.y, offset.z);
		const offsetWorld = Cesium.Matrix4.multiplyByPointAsVector(transform, offsetLocal, new Cesium.Cartesian3());
		return Cesium.Cartesian3.add(position, offsetWorld, new Cesium.Cartesian3());
	}
	
	public removeEntity(): void {
		if (this.entity) {
			this.map.viewer.entities.remove(this.entity);
		}
	}

	public get currentPosition(): Cesium.Cartesian3 | undefined {
		const currentTime = this.map.viewer.clock.currentTime;
		const position = (this.entity.position as Cesium.SampledPositionProperty).getValue(currentTime);
		if (position instanceof Cesium.Cartesian3) {
			return position;
		}
		return undefined;
	}

	public volumeByDistance(distance: number): number {
		const soundStartDistance = 1500; // meters
		if (distance < 100) return 1.0;
		if (distance > soundStartDistance) return 0.0;
		const t = (distance - 100) / (soundStartDistance - 100);
		const smoothT = t * t * (3 - 2 * t);
		return 1.0 - smoothT;
	}
}