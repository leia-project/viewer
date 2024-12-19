
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

import type { Map } from "$lib/components/map-cesium/module/map";
import type { Unsubscriber } from "svelte/store";
import { getPolygonCenter, polygonToCartesians } from "$lib/components/map-cesium/module/utils/geo-utils";


export class ProjectClippingPlanes {

	private map: Map;
	private coordinates: Array<[lon: number, lat: number]>;
	private clippingPlanes: Cesium.ClippingPlaneCollection | undefined;
	private mapLayersUnsubscriber!: Unsubscriber;

	constructor(map: Map, coordinates: Array<[lon: number, lat: number]>) {
		this.map = map;
		this.coordinates = coordinates;
	}

	public apply(layerNames: Array<string>): void {
		this.setClippingPlanes();
		this.clipGlobe();

		this.mapLayersUnsubscriber = this.map.layers.subscribe(() => {
			setTimeout(() => this.set3DTilesetClippingPlanes(layerNames), 1000);
		})
	}

	public remove(): void {
		this.remove3DTilesetClippingPlanes();
		this.map.viewer.scene.globe.clippingPlanes.removeAll();
		this.map.viewer.scene.globe.backFaceCulling = true;
		this.map.viewer.scene.globe.showSkirts = true;
		this.map.viewer.scene.skyAtmosphere.show = true;
		this.mapLayersUnsubscriber();
	}


	private setClippingPlanes(): void {
		const convexGeom = turf.convex(turf.polygon([this.coordinates]).geometry)?.geometry;
		if (!convexGeom) return;

		const polygon = convexGeom.coordinates[0].map((point): [lon: number, lat: number] => [point[0], point[1]]);
		const polygonC3 = polygonToCartesians(polygon);
		const center = getPolygonCenter(polygon);
		const centerC3 = Cesium.Cartesian3.fromDegrees(center[0], center[1]);

		// for (let x = 0; x < polygonC3.length; x++) {
		// 	this.map.viewer.entities.add({
		// 		position: polygonC3[x],
		// 		point: {
		// 			pixelSize: 10,
		// 			color: Cesium.Color.RED,
		// 			outlineColor: Cesium.Color.WHITE,
		// 			outlineWidth: 2
		// 		}
		// 	});
		// }
		

		if (polygonC3.length > 2) {
			// 1) get the local coordinate system of our convex center (transform the convexCenter to (0,0,0))
			// 2) get the inverse transformation matrix (this can be used to transform points relative to convexCenter)
			const transformMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(centerC3);
			const centerInverseTransform = Cesium.Matrix4.inverseTransformation(transformMatrix, new Cesium.Matrix4());

			const clippingPlanes = [];
			for (let i = 0; i < polygonC3.length - 1; i++) {
				// Transform the end points of the polygon edge and move to the local coordinate system
				const p1 = Cesium.Matrix4.multiplyByPoint(centerInverseTransform, polygonC3[i], new Cesium.Cartesian3());
				const p2 = Cesium.Matrix4.multiplyByPoint(centerInverseTransform, polygonC3[i + 1], new Cesium.Cartesian3());

				// Caclulate 1) right: horizontal vector, 2) up: vertical vector, and then 3) the normal on the plane described by 1 and 2
				const right = Cesium.Cartesian3.subtract(p1, p2, new Cesium.Cartesian3());
				const up = Cesium.Cartesian3.cross(p1, p2, new Cesium.Cartesian3());
				let normal = Cesium.Cartesian3.cross(up, right, new Cesium.Cartesian3());
				Cesium.Cartesian3.normalize(normal, normal);

				const planePlacedAtOrigin = new Cesium.Plane(normal, 0.0);
				const distance = Cesium.Plane.getPointDistance(planePlacedAtOrigin, p1);

				const negatedNormal = Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3());
				clippingPlanes.push(new Cesium.ClippingPlane(negatedNormal, distance));
			}
			

			const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
				planes: clippingPlanes,	
				enabled: true,
				modelMatrix: transformMatrix,
				unionClippingRegions: true,
				edgeColor: Cesium.Color.WHITE,
				edgeWidth: 3
			});
			
			this.clippingPlanes = clippingPlaneCollection;
		}
	}

	private clipGlobe(): void {
		let globeClippingPlanes = this.map.viewer.scene.globe.clippingPlanes;
		if (!globeClippingPlanes) globeClippingPlanes = new Cesium.ClippingPlaneCollection();
		globeClippingPlanes.removeAll();

		if (this.clippingPlanes) {
			for (let i = 0; i < this.clippingPlanes.length; i++) {
				globeClippingPlanes.add(this.clippingPlanes.get(i));
			}
			globeClippingPlanes.unionClippingRegions = this.clippingPlanes.unionClippingRegions;
			globeClippingPlanes.modelMatrix = this.clippingPlanes.modelMatrix;
			globeClippingPlanes.edgeColor = this.clippingPlanes.edgeColor;
			globeClippingPlanes.edgeWidth = this.clippingPlanes.edgeWidth;
			globeClippingPlanes.enabled = this.clippingPlanes.enabled;
		}
		this.map.viewer.scene.globe.clippingPlanes = globeClippingPlanes;
		this.map.viewer.scene.globe.backFaceCulling = false;
		this.map.viewer.scene.globe.showSkirts = false;
		this.map.viewer.scene.skyAtmosphere.show = false;
	}



	public set3DTilesetClippingPlanes(layerNames: Array<string>): void {
		if (!this.clippingPlanes) return;
		const primitives = this.map.viewer.scene.primitives;
		for (let i = 0; i < primitives.length; i++) {
			const primitive = primitives.get(i);
			if (primitive instanceof Cesium.Cesium3DTileset) {
				if (!primitive.clippingPlanes) primitive.clippingPlanes = new Cesium.ClippingPlaneCollection();
				primitive.clippingPlanes.removeAll(); // Remove all existing clipping planes on 3D Tileset

				for (let i = 0; i < this.clippingPlanes.length; i++) {
					primitive.clippingPlanes.add(this.clippingPlanes.get(i));
				}
				//@ts-ignore
				const centerInverseTransform = Cesium.Matrix4.inverseTransformation(primitive.clippingPlanesOriginMatrix, new Cesium.Matrix4());
				const modMat = Cesium.Matrix4.multiplyTransformation(centerInverseTransform, this.clippingPlanes.modelMatrix, new Cesium.Matrix4());
				primitive.clippingPlanes.modelMatrix = modMat;
				primitive.clippingPlanes.unionClippingRegions = this.clippingPlanes.unionClippingRegions;

				// Summary: Correct positioning of ClippingPlanes on a 3D Tileset:
				// 1. Get the inverse Matrix4 to transform objects to the reference point of clipping planes for the 3D tileset
				// 2. Bring the modelMatrix of the global clipping planes to the reference point of the 3D tileset from 1.
				// 3. Apply to the clipping planes of the 3D tileset
			}
		}

		// Resetting any other clipping planes (e.g. ClipSlider object) that may be active on a clipped 3D Tileset:
		/*
		for (const layer of get(this.map.layers)) {
			if (layerNames.includes(layer.config.title) && layer instanceof ThreedeeLayer) {
				//if (layer.clipControl) layer.clipControl.props.clipSlider?.active.set(false);
				//if (layer.clipControl?.props.clipSlider) layer.clipActive.set(false);
			}
		}
		*/
	}

	public remove3DTilesetClippingPlanes(): void {
		const primitives = this.map.viewer.scene.primitives;
		for (let i = 0; i < primitives.length; i++) {
			const primitive = primitives.get(i);
			if (primitive.clippingPlanes){
				primitive.clippingPlanes.removeAll();
			}
		}
	}
}