import type { Map } from "$lib/components/map-cesium/module/map";
import * as Cesium from "cesium";


export interface FlightPathPoint {
	lon: number,
	lat: number,
	height: number;
	speed: number;
	lookAt?: {
		lon: number,
		lat: number,
		height: number
	};
	angle?: number; // angle in degrees, camera tilt down from horizontal
}

export class FlightPath {

	private spline: Cesium.LinearSpline;
	private lookAtSpline: Cesium.LinearSpline;
	public positionProperty = new Cesium.SampledPositionProperty();
	public headingProperty = new Cesium.SampledProperty(Number);
	public pitchProperty = new Cesium.SampledProperty(Number);
	public startTime: Cesium.JulianDate;
	public stopTime: Cesium.JulianDate;

	public times: Array<number> = [0];
	private viewer?: Cesium.Viewer;

	constructor(points: Array<FlightPathPoint>, startTime?: Cesium.JulianDate) {
		if (points.length < 2) {
			throw new Error("FlightPath needs at least 2 points");
		}

		this.startTime = startTime ?? Cesium.JulianDate.now();
		
		const positions: Cesium.Cartesian3[] = [];
		const lookAtPositions: Cesium.Cartesian3[] = [];
		
		let totalDistance = 0;
		const distances: Array<number> = [0]; // First point is at distance 0
		for (let i = 1; i < points.length; i++) {
			const p1 = Cesium.Cartesian3.fromDegrees(points[i-1].lon, points[i-1].lat, points[i-1].height);
			const p2 = Cesium.Cartesian3.fromDegrees(points[i].lon, points[i].lat, points[i].height);
			positions.push(p1);
			
			// Calculate distance between points
			const segmentDistance = Cesium.Cartesian3.distance(p1, p2);
			totalDistance += segmentDistance;
			distances.push(totalDistance);
			
			// Create lookAt points if available
			const lookAt = points[i-1].lookAt;
			if (lookAt) {
				lookAtPositions.push(Cesium.Cartesian3.fromDegrees(
					lookAt.lon,
					lookAt.lat,
					lookAt.height
				));
			} else {
				lookAtPositions.push(p2);
			}
		}

		// Add the last point
		positions.push(Cesium.Cartesian3.fromDegrees(
			points[points.length-1].lon,
			points[points.length-1].lat,
			points[points.length-1].height
		));
		
		const lookAt = points[points.length-1].lookAt;
		if (lookAt) {
			lookAtPositions.push(Cesium.Cartesian3.fromDegrees(
				lookAt.lon,
				lookAt.lat,
				lookAt.height
			));
		} else {
			const lastDir = Cesium.Cartesian3.subtract(
				positions[positions.length-1],
				positions[positions.length-2],
				new Cesium.Cartesian3()
			);
			lookAtPositions.push(lastDir);
		}
		
		let currentTime = 0;
	 	for (let i = 1; i < points.length; i++) {
			const avgSpeed = points[i-1].speed;// (points[i-1].speed + points[i].speed) / 2;
			const segmentDistance = distances[i] - distances[i-1];
			const segmentTime = segmentDistance / avgSpeed;
			
			currentTime += segmentTime;
			this.times.push(currentTime);
		}
		console.log(this.times)
		
		this.spline = new Cesium.LinearSpline({
			times: this.times,
			points: positions
		});

		this.lookAtSpline = new Cesium.LinearSpline({
			times: this.times,
			points: lookAtPositions
		});
		
		this.stopTime = Cesium.JulianDate.addSeconds(this.startTime, currentTime, new Cesium.JulianDate());
		this.samplePath(points);
	}

	
	private samplePath(points: FlightPathPoint[]): void {
		const totalDuration = Cesium.JulianDate.secondsDifference(this.stopTime, this.startTime);
		const sampleCount = Math.max(100, totalDuration * 10); // At least 10 samples per second
		const sampleInterval = totalDuration / sampleCount;
		
		for (let i = 0; i <= sampleCount; i++) {
			const t = i * sampleInterval;
			const timePoint = Cesium.JulianDate.addSeconds(this.startTime, t, new Cesium.JulianDate());

			const position = this.spline.evaluate(t);
			const lookAtPosition = this.lookAtSpline.evaluate(t);
			if (!(position instanceof Cesium.Cartesian3) || !(lookAtPosition instanceof Cesium.Cartesian3)) continue;

			this.positionProperty.addSample(timePoint, position);			
			const hp = this.computeHeadingPitch(position, lookAtPosition);
			this.headingProperty.addSample(timePoint, hp.heading);	
		}

		for (let i = 0; i < points.length; i++) {
			const t = this.times[i];
			const position = this.spline.evaluate(t);
			const lookAtPosition = this.lookAtSpline.evaluate(t);
			if (!(position instanceof Cesium.Cartesian3) || !(lookAtPosition instanceof Cesium.Cartesian3)) continue;
			const hp = this.computeHeadingPitch(position, lookAtPosition);
			const angle = points[i].angle;
			if (angle) {
				hp.pitch = Cesium.Math.toRadians(-angle);
			}
			const timePoint = Cesium.JulianDate.addSeconds(this.startTime, t, new Cesium.JulianDate());
			this.pitchProperty.addSample(timePoint, hp.pitch);
		}
	}

	private computeHeadingPitch(start: Cesium.Cartesian3, end: Cesium.Cartesian3): { heading: number, pitch: number } {
		const direction = Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3());
		Cesium.Cartesian3.normalize(direction, direction);

		const transform = Cesium.Transforms.eastNorthUpToFixedFrame(start);
		const inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
		const localDirection = Cesium.Matrix4.multiplyByPointAsVector(inverseTransform, direction, new Cesium.Cartesian3());

		const heading = Math.atan2(localDirection.x, localDirection.y); // X = East, Y = North in ENU
		const pitch = Math.asin(localDirection.z); // Z = Up in ENU

		return { heading, pitch }; // In radians
	}

	
	public applyToCamera(viewer: Cesium.Viewer): void {
		viewer.clock.startTime = this.startTime.clone();
		viewer.clock.stopTime = this.stopTime.clone();
		viewer.clock.currentTime = this.startTime.clone();
		viewer.clock.multiplier = 1;
		viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
		viewer.clock.shouldAnimate = true;

		this.viewer = viewer;
		this.viewer.scene.postUpdate.addEventListener(this.onPostUpdate);
	}

	public stopApplyingToCamera(viewer: Cesium.Viewer): void {
		viewer.clock.shouldAnimate = false;
		viewer.scene.postUpdate.removeEventListener(this.onPostUpdate);
	}

	private onPostUpdate = (scene: Cesium.Scene, time: Cesium.JulianDate) => {
		if (!Cesium.JulianDate.greaterThanOrEquals(time, this.startTime) ||
			!Cesium.JulianDate.lessThanOrEquals(time, this.stopTime)) {
			return;
		}

		const position = this.positionProperty.getValue(time);
		const heading = this.headingProperty.getValue(time);
		const pitch = this.pitchProperty.getValue(time);
		
		if (position && heading) {
			const hpr = new Cesium.HeadingPitchRoll(heading, pitch, 0);
			this.viewer?.scene.camera.setView({
				destination: position,
				orientation: hpr
			});
		}
	}

	public getStartTime(): Cesium.JulianDate {
		return this.startTime;
	}
	
	public getStopTime(): Cesium.JulianDate {
		return this.stopTime;
	}

	public getTimedPosition(time: Cesium.JulianDate): Cesium.Cartesian3 | undefined {
		const position = this.positionProperty.getValue(time);
		if (position instanceof Cesium.Cartesian3) {
			return position;
		}
		return undefined;
	}

	public debug(map: Map): void {
		for (const point of this.spline.points) {
			if (!(point instanceof Cesium.Cartesian3)) continue;
			const r = Math.floor(Math.random() * 256);
			const entity = new Cesium.Entity({
				position: point,
				point: {
					pixelSize: 10,
					color: Cesium.Color.fromBytes(r, 0, 0, 255),
				}
			});
			map.viewer.entities.add(entity);
		}
	}
}
