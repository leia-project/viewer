import * as Cesium from "cesium";
import * as turf from "@turf/turf";

import type { Map } from "$lib/components/map-cesium/module/map";
import { CameraLocation } from "$lib/components/map-core/camera-location";
import { getPolygonCenter } from "$lib/components/map-cesium/module/utils/geo-utils";


class CameraLimits {
	public minLon: number;
	public maxLon: number;
	public minLat: number;
	public maxLat: number;
	public minZ: number;
	public maxZ: number;

	constructor(minLon: number, maxLon: number, minLat: number, maxLat: number, minZ: number, maxZ: number) {
		this.minLon = minLon;
		this.maxLon = maxLon;
		this.minLat = minLat;
		this.maxLat = maxLat;
		this.minZ = minZ;
		this.maxZ = maxZ;
	}
}

export class ProjectCamera {

	private map: Map;
	private coordinates: Array<[lon: number, lat: number]>;
	private center: [lon: number, lat: number];
	private cameraLimits!: CameraLimits;
	private boundingDome!: Cesium.Entity;
	private animationTime: number;
	private cameraStartPosition: CameraLocation | undefined;

	private cameraListener: () => void;

	constructor(map: Map, coordinates: Array<[lon: number, lat: number]>, animationTime: number, cameraPosition: CameraLocation | undefined) {
		this.map = map;
		this.coordinates = coordinates;
		this.center = getPolygonCenter(this.coordinates);
		this.animationTime = animationTime;
		this.cameraStartPosition = cameraPosition;
		this.cameraListener = () => this.validateCameraPosition(this.map, this.cameraLimits, this.center);
	}


	public bound(): void {
		this.zoomToProject();
		this.setCameraLimits();
		setTimeout(() => this.addBoundingDome(), this.animationTime - 100);
		setTimeout(() => {
			this.map.viewer.scene.postRender.addEventListener(this.cameraListener);
		}, this.animationTime);
	}

	public unbound(): void {
		if (this.boundingDome) this.map.viewer.entities.remove(this.boundingDome);
		this.map.viewer.scene.postRender.removeEventListener(this.cameraListener);
	}

	public zoomToProject(): void {
		if (!this.cameraStartPosition) {
			const bbox = turf.bbox(turf.polygon([this.coordinates]).geometry);
			const width = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[1]]), {units: "radians"});
			const length = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[0], bbox[3]]), {units: "radians"});
			const z = Math.max(8, turf.radiansToLength(Math.max(width, length), "meters") * 1.3);

			const longs = this.coordinates.map((c: Array<number>) => c[0]);
			const middleLong = (Math.min(...longs) + Math.max(...longs)) / 2;
			const lat = Math.min(...this.coordinates.map((c: Array<number>) => c[1]));
			let distance = turf.distance(turf.point([middleLong, lat]), this.center, {units: "meters"});
			let pitch = Math.atan(z / Math.abs(distance)) * 180 / Math.PI;

			this.cameraStartPosition = new CameraLocation(
				middleLong,
				lat,
				z,
				0,      // heading
				-pitch,    // pitch
				1.5     // duration
			);
		}
		this.map.flyTo(this.cameraStartPosition);

		// or something with viewBoundingSphere?
	}

	private setCameraLimits(): void {
		const lons = this.coordinates.map((c: any) => c[0]);
		const lats = this.coordinates.map((c: any) => c[1]);
		const offset = 0.01;
		const minLon = (Math.min(...lons) - offset) / 180 * Math.PI;
		const maxLon = (Math.max(...lons) + offset) / 180 * Math.PI;
		const minLat = (Math.min(...lats) - offset) / 180 * Math.PI;
		const maxLat = (Math.max(...lats) + offset) / 180 * Math.PI;
		const lonRange = Math.abs(maxLon-minLon);
		const latRange = Math.abs(maxLat-minLat);
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

	private validateCameraPosition(map: Map, cameraLimits: CameraLimits, center: [lon: number, lat: number]): void {
		const cam = map.viewer.camera;
		const position = cam.positionCartographic;

		const lon = position.longitude;
		const lat = position.latitude;
		
		let newLon, newLat, newHeight;
		if (lon < cameraLimits.minLon) newLon = cameraLimits.minLon;
		else if (lon > cameraLimits.maxLon) newLon = cameraLimits.maxLon, lat, position.height;
		if (lat < cameraLimits.minLat) newLat = cameraLimits.minLat;
		else if (lat > cameraLimits.maxLat) newLat = cameraLimits.maxLat;
		if (position.height < cameraLimits.minZ) newHeight = cameraLimits.minZ;
		else if (position.height > cameraLimits.maxZ) newHeight = cameraLimits.maxZ;

		if (newLon || newLat || newHeight) {
			//cam.position = Cesium.Cartesian3.fromRadians(newLon ?? lon, newLat ?? lat, newHeight ?? position.height);
			//const from = turf.feature({type: "Point", coordinates: [lon, lat]});
			const from = turf.point([lon * 180 / Math.PI, lat * 180 / Math.PI]);
			let heading = turf.bearing(from, center);
			if (heading < 0) heading += 360;
			let distance = turf.distance(from, center, {units: "meters"}) * -1;
			let pitch = Math.atan((newHeight ?? position.height) / Math.abs(distance));
			cam.setView({
				destination: Cesium.Cartesian3.fromRadians(newLon ?? lon, newLat ?? lat, newHeight ?? position.height),
				orientation: new Cesium.HeadingPitchRoll(heading / 180 * Math.PI, -pitch, cam.roll)
			})
		}
	}


	private addBoundingDome(): void {
		const lonExtent = Math.abs(this.cameraLimits.maxLon - this.cameraLimits.minLon) * 180 / Math.PI;
		const latExtent = Math.abs(this.cameraLimits.maxLat - this.cameraLimits.minLat) * 180 / Math.PI;
		const maxExtent = Math.max(lonExtent, latExtent);
		const maxDistance = maxExtent * 111000 * 4; // 4 is a magic number to make it look good
		const radii = new Cesium.Cartesian3(maxDistance, maxDistance, maxDistance);
		
		this.boundingDome = new Cesium.Entity({
			position: Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1]),
			ellipsoid: {
				radii: radii,
			}
		});
		this.map.viewer.entities.add(this.boundingDome);
		this.map.refresh();
	}
}