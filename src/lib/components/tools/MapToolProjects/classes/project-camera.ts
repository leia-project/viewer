import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { Feature, Point } from "geojson";
import { CameraLocation } from "$lib/map-core/camera-location";

import type { Map } from "$lib/map-cesium/map";
import { getPolygonCenter } from "$lib/map-cesium/helpers";

class CameraLimits {
	public minLon: number;
	public maxLon: number;
	public minLat: number;
	public maxLat: number;
	public minZ: number;
	public maxZ: number;

	constructor(
		minLon: number,
		maxLon: number,
		minLat: number,
		maxLat: number,
		minZ: number,
		maxZ: number
	) {
		this.minLon = minLon;
		this.maxLon = maxLon;
		this.minLat = minLat;
		this.maxLat = maxLat;
		this.minZ = minZ;
		this.maxZ = maxZ;
	}
}

export class ProjectCamera {
	public map: Map;
	public _coordinates: Array<[lon: number, lat: number]>;
	public center: [lon: number, lat: number];
	private cameraLimits: CameraLimits = new CameraLimits(
		-Math.PI,
		Math.PI,
		-Math.PI / 2,
		Math.PI / 2,
		-10000000,
		10000000
	);
	private boundingDome: Cesium.Entity | undefined;
	public cameraStartPosition: CameraLocation | undefined;
	public cameraListener: () => void;

	set coordinates(value: Array<[lon: number, lat: number]>) {
		if (value.length < 2) throw new Error("Coordinates must contain at least 2 points");
		this._coordinates = value;
		this.center = getPolygonCenter(this._coordinates);
	}

	constructor(
		map: Map,
		coordinates: Array<[lon: number, lat: number]>,
		startPosition: CameraLocation | undefined = undefined
	) {
		this.map = map;
		this._coordinates = coordinates;
		this.center = getPolygonCenter(this._coordinates);
		this.cameraStartPosition = startPosition;
		this.cameraListener = () =>
			this.validateCameraPosition(this.map, this.cameraLimits, this.center);
	}

	public bound(
		animationTime: number = 1000,
		showBoundingVolume: boolean = false
	): void {
		if (showBoundingVolume) {
			setTimeout(() => this.addBoundingDome(), animationTime - 100);
		}

		setTimeout(() => {
			this.map.viewer.scene.postRender.addEventListener(this.cameraListener);
		}, animationTime);
		this.setCameraLimits();
		this.zoomToProject(animationTime);
	}

	public unbound(): void {
		if (this.boundingDome) this.map.viewer.entities.remove(this.boundingDome);
		this.map.viewer.scene.postRender.removeEventListener(this.cameraListener);
	}

	public zoomToProject(animationTime: number = 1000): void {
		if (!this.cameraStartPosition) {
			const z = this.getDefaultCameraHeight();
			const longs = this._coordinates.map((c: Array<number>) => c[0]);
			const middleLong = (Math.min(...longs) + Math.max(...longs)) / 2;
			const lat = Math.min(...this._coordinates.map((c: Array<number>) => c[1]));
			let distance = turf.distance(turf.point([middleLong, lat]), this.center, { units: "meters" });
			let pitch = (Math.atan(z / Math.abs(distance)) * 180) / Math.PI;

			this.cameraStartPosition = new CameraLocation(
				middleLong,
				lat,
				z,
				0, // heading
				-pitch // pitch
			);
		}
		this.cameraStartPosition.duration = animationTime / 1000;
		this.map.flyTo(this.cameraStartPosition);

		// or something with viewBoundingSphere?
	}

	private setCameraLimits(): void {
		const lons = this._coordinates.map((c: any) => c[0]);
		const lats = this._coordinates.map((c: any) => c[1]);
		const offset = 0.01;
		const minLon = ((Math.min(...lons) - offset) / 180) * Math.PI;
		const maxLon = ((Math.max(...lons) + offset) / 180) * Math.PI;
		const minLat = ((Math.min(...lats) - offset) / 180) * Math.PI;
		const maxLat = ((Math.max(...lats) + offset) / 180) * Math.PI;
		const lonRange = Math.abs(maxLon - minLon);
		const latRange = Math.abs(maxLat - minLat);
		const zRange = Math.max(lonRange, latRange) * 10000000;
		const factor = 1.4;
		this.cameraLimits = new CameraLimits(
			minLon - lonRange * factor,
			maxLon + lonRange * factor,
			minLat - latRange * factor,
			maxLat + latRange * factor,
			-zRange,
			zRange
		);
	}

	private validateCameraPosition(
		map: Map,
		cameraLimits: CameraLimits,
		center: [lon: number, lat: number]
	): void {
		const cam = map.viewer.camera;
		const position = cam.positionCartographic;

		const lon = position.longitude;
		const lat = position.latitude;

		let newLon, newLat, newHeight;
		if (lon < cameraLimits.minLon) newLon = cameraLimits.minLon;
		else if (lon > cameraLimits.maxLon) (newLon = cameraLimits.maxLon), lat, position.height;
		if (lat < cameraLimits.minLat) newLat = cameraLimits.minLat;
		else if (lat > cameraLimits.maxLat) newLat = cameraLimits.maxLat;
		if (position.height < cameraLimits.minZ) newHeight = cameraLimits.minZ;
		else if (position.height > cameraLimits.maxZ) newHeight = cameraLimits.maxZ;

		if (newLon || newLat || newHeight) {
			//cam.position = Cesium.Cartesian3.fromRadians(newLon ?? lon, newLat ?? lat, newHeight ?? position.height);
			//const from = turf.feature({type: "Point", coordinates: [lon, lat]});
			const from = turf.point([(lon * 180) / Math.PI, (lat * 180) / Math.PI]);
			let heading = this.getHeading(from, center);
			if (heading < 0) heading += 360;
			let distance = turf.distance(from, center, { units: "meters" }) * -1;
			let pitch = this.getPitch(newHeight ?? position.height, distance);
			cam.setView({
				destination: Cesium.Cartesian3.fromRadians(
					newLon ?? lon,
					newLat ?? lat,
					newHeight ?? position.height
				),
				orientation: new Cesium.HeadingPitchRoll((heading / 180) * Math.PI, -pitch, cam.roll)
			});
		}
	}

	public getHeading(from: Feature<Point>, center: [lon: number, lat: number]): number {
		return turf.bearing(from, center);
	}

	public getPitch(height: number, distance: number): number {
		return Math.atan(height / Math.abs(distance));
	}

	private addBoundingDome(): void {
		const lonExtent =
			(Math.abs(this.cameraLimits.maxLon - this.cameraLimits.minLon) * 180) / Math.PI;
		const latExtent =
			(Math.abs(this.cameraLimits.maxLat - this.cameraLimits.minLat) * 180) / Math.PI;
		const maxExtent = Math.max(lonExtent, latExtent);
		const maxDistance = maxExtent * 111000 * 4; // 4 is a magic number to make it look good
		const radii = new Cesium.Cartesian3(maxDistance, maxDistance, maxDistance);
		this.boundingDome = new Cesium.Entity({
			position: Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1]),
			ellipsoid: {
				radii: radii,
				material: Cesium.Color.GAINSBORO.withAlpha(0.99)
			}
		});
		this.map.viewer.entities.add(this.boundingDome);
		this.map.refresh();
	}

	public getDefaultCameraHeight(): number {
		const bbox = turf.bbox(turf.points(this._coordinates));
		const width = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[1]]), {
			units: "radians"
		});
		const length = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[0], bbox[3]]), {
			units: "radians"
		});
		const z = Math.max(8, turf.radiansToLength(Math.max(width, length), "meters") * 1.8);
		return z;
	}
}

export class ProjectCamera2D3D extends ProjectCamera {
	public mode3D: Writable<boolean>;
	private mode3DUnsubscriber!: Unsubscriber;

	set _2D(value: boolean) {
		this.mode3D.set(!value);
	}
	set _3D(value: boolean) {
		this.mode3D.set(value);
	}
	get _3D(): boolean {
		return get(this.mode3D);
	}

	constructor(
		map: Map,
		coordinates: Array<[lon: number, lat: number]>,
		cameraPosition: CameraLocation | undefined = undefined,
		mode3D: Writable<boolean> = writable(true)
	) {
		super(map, coordinates, cameraPosition);
		this.mode3D = mode3D;
	}

	public bound(animationTime: number = 1000, showBoundingVolume: boolean = true): void {
		super.bound(animationTime, showBoundingVolume);
		this.mode3DUnsubscriber = this.mode3D.subscribe((b: boolean) => {
			b ? this.switchTo3DView() : this.switchTo2DView();
		});
	}

	public unbound(): void {
		super.unbound();
		this.mode3DUnsubscriber();
	}

	public getHeading(from: Feature<Point>, center: [lon: number, lat: number]): number {
		return this._3D ? turf.bearing(from, center) : 0;
	}

	public getPitch(height: number, distance: number): number {
		return this._3D ? Math.atan(height / Math.abs(distance)) : (90.0 * Math.PI) / 180;
	}

	public zoomToProject(): void {
		if (this._3D) {
			this.map.viewer.scene.screenSpaceCameraController.enableTilt = true;
			super.zoomToProject();
		} else this.zoomToProject2D();
	}

	public zoomToProject2D(): void {
		this.map.viewer.scene.screenSpaceCameraController.enableTilt = false;
		const pitch = -90;
		const cameraHeight = this.getDefaultCameraHeight();
		const centerDestination = Cesium.Cartographic.toCartesian(
			Cesium.Cartographic.fromDegrees(this.center[0], this.center[1], cameraHeight)
		);

		this.map.viewer.camera.flyTo({
			destination: centerDestination,
			orientation: {
				heading: 0,
				pitch: Cesium.Math.toRadians(pitch),
				roll: 0
			},
			duration: 2
		});
	}

	public switchTo3DView(): void {
		this.map.viewer.scene.screenSpaceCameraController.enableTilt = true;
		const pitch = -45;
		const cameraCartographic = this.map.viewer.camera.positionCartographic;
		const lon = Cesium.Math.toDegrees(cameraCartographic.longitude);
		const lat = Cesium.Math.toDegrees(cameraCartographic.latitude);
		const offsetLat = (cameraCartographic.height / 1000) * 0.01;

		const cameraDestination = Cesium.Cartographic.toCartesian(
			Cesium.Cartographic.fromDegrees(lon, lat - offsetLat, cameraCartographic.height)
		);

		this.map.viewer.camera.flyTo({
			destination: cameraDestination,
			orientation: {
				heading: 0,
				pitch: Cesium.Math.toRadians(pitch),
				roll: 0
			},
			duration: 2
		});
	}

	public switchTo2DView(): void {
		this.map.viewer.scene.screenSpaceCameraController.enableTilt = false;
		let destination = this.map.viewer.camera.pickEllipsoid(
			new Cesium.Cartesian2(this.map.viewer.canvas.width / 2, this.map.viewer.canvas.height / 2) // Zooms too far at low pitch angles when picking height/2
		);
		if (!destination) {
			destination = this.map.viewer.camera.position;
		}

		const destinationCartographic = Cesium.Cartographic.fromCartesian(destination);
		destinationCartographic.height = Math.abs(this.map.viewer.camera.positionCartographic.height);
		destination = Cesium.Cartographic.toCartesian(destinationCartographic);

		this.map.viewer.camera.flyTo({
			destination: destination,
			orientation: {
				heading: Cesium.Math.toRadians(0),
				pitch: Cesium.Math.toRadians(-90),
				roll: 0
			},
			duration: 2
		});
	}
}
