import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { CameraLocation } from "$lib/map-core/camera-location";

import type { Map } from "$lib/map-cesium/map";
import { ProjectCamera } from "./project-camera";
import { projectHandler } from "../project-handler";
import {
	getPolygonCenter,
	polygonToCartesians
} from "$lib/map-cesium/helpers";


export class FocusArea {

	public uuid: string = uuidv4();
	public map: Map;
	protected animationTime: number;
	public coordinates: Array<[lon: number, lat: number]>;
	public center: [lon: number, lat: number];
	private useGeoTOP?: boolean;

	public projectCamera: ProjectCamera;
	protected projectHighlight: Cesium.GroundPrimitive;

	public processing: Writable<boolean> = writable(false);

	constructor(map: Map, polygon: Array<[lon: number, lat: number]>, animationTime: number = 1500, cameraPosition?: CameraLocation, useGeoTOP?: boolean) {
		this.map = map;
		this.animationTime = animationTime;
		this.useGeoTOP = useGeoTOP;
		this.coordinates = this.closePolygon(polygon);
		this.center = getPolygonCenter(this.coordinates);
		this.projectCamera = new ProjectCamera(
			map,
			this.coordinates,
			this.getCameraPosition(cameraPosition)
		);
		this.projectHighlight = this.highlightHole();
	}

	public activate(): void {
		this.processing.set(true);
		this.projectCamera.bound(this.animationTime);
		this.projectHighlight.show = true;
		setTimeout(() => {
			this.cutout(get(projectHandler.clip));
			this.processing.set(false);
		}, this.animationTime);
	}

	public deactivate(): void {
		this.projectCamera.unbound();
		this.cutout(false);
		this.projectHighlight.show = false;
		this.map.viewer.scene.requestRender();
	}

	public cutout(clip: boolean): void {
		if (clip) {
			this.map.clipHandler.clip({
				clipId: this.uuid,
				polygon: this.coordinates,
				outside: true,
				clipTilesets: true,
				box: true,
				useGeoTOP: this.useGeoTOP
			}, 1);
		} else {
			this.map.clipHandler.removeClipById(this.uuid);
		}
		this.map.refresh();
	}

	private closePolygon(
		coordinates: Array<[lon: number, lat: number]>
	): Array<[lon: number, lat: number]> {
		if (coordinates.length > 0) {
			const firstPoint = coordinates[0];
			const lastPoint = coordinates[coordinates.length - 1];
			if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
				// The polygon is not closed, close it
				coordinates.push(firstPoint);
			}
		}
		return coordinates;
	}

	private getCameraPosition(cameraPosition?: CameraLocation): CameraLocation | undefined {
		if (
			cameraPosition?.x !== undefined &&
			cameraPosition?.y !== undefined &&
			cameraPosition?.z !== undefined &&
			cameraPosition?.heading !== undefined &&
			cameraPosition?.pitch !== undefined &&
			cameraPosition?.duration !== undefined
		) {
			return new CameraLocation(
				cameraPosition.x,
				cameraPosition.y,
				cameraPosition.z,
				cameraPosition.heading,
				cameraPosition.pitch,
				cameraPosition.duration
			);
		}
		return undefined;
	}

	private highlightHole(): Cesium.GroundPrimitive {
		const hole = polygonToCartesians(this.coordinates);
		const size = 5;
		const outerPositions = [
			Cesium.Cartesian3.fromDegrees(this.center[0] - size, this.center[1] - size),
			Cesium.Cartesian3.fromDegrees(this.center[0] + size, this.center[1] - size),
			Cesium.Cartesian3.fromDegrees(this.center[0] + size, this.center[1] + size),
			Cesium.Cartesian3.fromDegrees(this.center[0] - size, this.center[1] + size)
		];
		const polygonGeometry = new Cesium.PolygonGeometry({
			polygonHierarchy: new Cesium.PolygonHierarchy(outerPositions, [
				new Cesium.PolygonHierarchy(hole)
			])
		});
		const geometryInstance = new Cesium.GeometryInstance({
			geometry: polygonGeometry,
			attributes: {
				color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLACK.withAlpha(0.15))
			}
		});
		const primitive = new Cesium.GroundPrimitive({
			geometryInstances: [geometryInstance],
			appearance: new Cesium.PerInstanceColorAppearance({
				translucent: true,
				closed: true
			}),
			allowPicking: false,
			show: false
		});
		this.map.viewer.scene.primitives.add(primitive);
		return primitive;
	}
}
