import { get, type Unsubscriber } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { LayerConfig} from "$lib/map-core/layer-config";

import type { Map } from "$lib/map-cesium/map"
import { getPolygonCenter, getPolygonOnTerrain, polygonToCartesians } from "$lib/map-cesium/helpers";
import { ThreedeeLayer } from "./layers/threedee-layer";


export interface IClipOptions {
	clipId: string;
	clip?: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon>;
	polygon?: Array<[lon: number, lat: number]>;
	multiPolygon?: Array<Array<[lon: number, lat: number]>>;
	inside?: boolean;
	outside?: boolean;
	clipTilesets?: boolean;
	unclippedTilesets?: Array<string>
	box?: boolean;
	useGeoTOP?: boolean;
}

interface IClip {
	clipId: string;
	clip: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon>;
	outside: boolean;
	polygons?: Array<Array<[lon: number, lat: number]>>;
	clipTilesets: boolean;
	unclippedTilesets: Array<string>;
	box: boolean;
	useGeoTOP?: boolean;
	priority: number;
}


export class ClipHandler {

	private map: Map;
	private clips: Array<IClip> = [];
	private box: Cesium.Primitive | undefined;
	private bottomEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource("clip-bottom-plane");
	private wallDepth: number = 40;
	private globeOpacityUnsubscriber: Unsubscriber | undefined;

	constructor(map: Map) {
		this.map = map;
		this.map.options.terrainSwitchReady.subscribe(() => {
			if (this.clips[0] && this.clips[0].box && this.clips[0].polygons) this.addBox(this.clips[0].polygons);
		});
	}

	public hasClip(): boolean {
		return !!((this.map.viewer.scene.globe.clippingPlanes && this.map.viewer.scene.globe.clippingPlanes.length > 0) || this.map.viewer.scene.globe.clippingPolygons?.length)
	}

	/**
	 * Clips the map based on the provided options.
	 * 
	 * @param options - The clipping options.
	 * @param options.clipId - String to identify the clip.
	 * @param options.clip - An optional clipping object: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon>.
	 * @param options.polygon - An optional array of longitude and latitude pairs defining a polygon.
	 * @param options.multiPolygon - An optional array of arrays of longitude and latitude pairs defining multiple polygons.
	 * @param options.inside - An optional boolean indicating if the clipping should be inside the polygon(s).
	 * @param options.outside - An optional boolean indicating if the clipping should be outside the polygon(s).
	 * @param options.clipTilesets - An optional boolean indicating if the tilesets should be clipped.
	 * @param options.unclippedTilesets - An optional array of tileset names that should not be clipped.
	 * @param options.box - An optional boolean indicating if a box should be added to the map.
	 * @param priority - An optional number indicating the priority of the clip.
	 */
	public clip(options: IClipOptions, priority: number = 1): void {
		if (this.clips.find((clip) => clip.clipId === options.clipId)) {
			console.warn(`Clip with id ${options.clipId} already exists. Aborting clip.`);
			return;
		}
		let clip: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon> | undefined;
		const polygons = options.multiPolygon ?? (options.polygon ? [options.polygon] : undefined);
		const outside = options.outside ?? !options.inside;
		if (options.clip) {
			clip = options.clip;
		} else if (polygons) {
			clip = this.getClip(polygons, outside);
			if (!clip) return;
		}
		else return;

		const clipObj: IClip = {
			clipId: options.clipId,
			clip: clip,
			outside: outside,
			polygons: polygons,
			clipTilesets: options.clipTilesets ?? true,
			unclippedTilesets: options.unclippedTilesets ?? [],
			box: options.box ?? false,
			useGeoTOP: options.useGeoTOP ?? false,
			priority: priority
		};
		this.clips.push(clipObj);
		this.clips.sort((a, b) => b.priority - a.priority);
		this.updateClip();
	}

	/**
	 * Removes the clip with the provided clipId and updates the clipping.
	 * 
	 * @param clipId - The id of the clip to remove. Corresponds to the clipId provided when invoking clip().
	 */
	public removeClipById(clipId?: string): void {
		const index = this.clips.findIndex((clip) => clip.clipId === clipId);
		if (index === -1) return;
		this.clips.splice(index, 1);
		this.updateClip();
	}

	/**
	 * Removes any clipping from the map.
	 * 
	 */
	public removeAll(): void {
		this.clips = [];
		this.reset();
	}


	private reset(): void {
		//@ts-ignore
		this.map.viewer.scene.globe.clippingPolygons = undefined;
		this.map.viewer.scene.globe.clippingPlanes?.removeAll();
		this.removeAll3DTilesetClips();
		this.map.layerLibrary.off("layerAdded", this.clipOnLayerAdded);
		if (this.box) this.map.viewer.scene.primitives.remove(this.box);
		this.map.viewer.dataSources.remove(this.bottomEntities);
		this.globeOpacityUnsubscriber?.();
		this.box = undefined;
	}

	private updateClip(): void {
		this.reset();
		const prio = this.clips[0];
		if (!prio) return;
		
		this.clipGlobe(prio.clip, prio.outside);
		if (prio.clipTilesets) {
			this.set3DTilesetClippingPlanes(prio.clip, prio.outside, prio.unclippedTilesets);
			this.map.layerLibrary.on("layerAdded", this.clipOnLayerAdded);
		}
		if (prio.box && prio.polygons) {
			this.addBox(prio.polygons);
		}
	}

	public getClip(polygons: Array<Array<[lon: number, lat: number]>>, outside: boolean = false): Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon> | undefined {
		let clip: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon> | undefined;
		let useClippingPlanes: boolean = false;
		if (polygons.length === 1) {
			const coordinates = turf.polygon(polygons).geometry;
			const convex = turf.convex(coordinates)?.geometry;
			useClippingPlanes = convex && turf.booleanEqual(coordinates, convex) ? true : false;
			if (useClippingPlanes) {
				clip = this.getClippingPlaneCollection(polygons[0], outside);
				return clip;
			}
		}
		clip = polygons.map((polygon) => this.getClippingPolygon(polygon));
		return clip;
	}

	private getClippingPlaneCollection(polygon: Array<[lon: number, lat: number]>, clipOutside: boolean): Cesium.ClippingPlaneCollection | undefined {
		const polygonC3 = polygonToCartesians(polygon);
		const center = getPolygonCenter(polygon);
		const centerC3 = Cesium.Cartesian3.fromDegrees(center[0], center[1]);

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
				let distance = Cesium.Plane.getPointDistance(planePlacedAtOrigin, p1);

				if (clipOutside) {
					Cesium.Cartesian3.negate(normal, normal);
				} else {
					distance = -distance;
				}
				clippingPlanes.push(new Cesium.ClippingPlane(normal, distance));

				/* Debugging:				
				this.map.viewer.entities.add({
					position: centerC3,
					plane: {
						plane: new Cesium.Plane(normal, distance),
						dimensions: new Cesium.Cartesian2(150.0, 150.0),
						material: Cesium.Color.fromRandom({alpha: 0.4})
					},
				});
				*/
			}

			const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
				planes: clippingPlanes,	
				enabled: true,
				modelMatrix: transformMatrix,
				unionClippingRegions: clipOutside
			});
			
			return clippingPlaneCollection;
		}
	}

	private getClippingPolygon(polygon: Array<[lon: number, lat: number]>): Cesium.ClippingPolygon {
		const polygonC3 = polygonToCartesians(polygon);
		const clippingPolygon = new Cesium.ClippingPolygon({
			positions: polygonC3
		});
		return clippingPolygon;
	}

	private getPriorityClip(): IClip | undefined {
		return this.clips[0];
	}

	private clipGlobe(clip: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon>, outside: boolean): void {
		const globe = this.map.viewer.scene.globe;
		if (clip instanceof Cesium.ClippingPlaneCollection) {			//@ts-ignore
			globe.clippingPolygons = undefined;
			globe.clippingPlanes?.removeAll();
			globe.clippingPlanes = globe.clippingPlanes || new Cesium.ClippingPlaneCollection();
			for (let i = 0; i < clip.length; i++) {
				globe.clippingPlanes.add(clip.get(i));
			}
			globe.clippingPlanes.unionClippingRegions = clip.unionClippingRegions;
			globe.clippingPlanes.modelMatrix = clip.modelMatrix;
			globe.clippingPlanes.edgeColor = clip.edgeColor;
			globe.clippingPlanes.edgeWidth = clip.edgeWidth;
		} else {
			//@ts-ignore
			globe.clippingPlanes = undefined;
			globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
				polygons: clip,
				inverse: outside
			});
		}
	}

	public clip3DTileset(tileset: Cesium.Cesium3DTileset, clip?: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon>, outside?: boolean): void {
		if (!clip || !outside) {
			const prio = this.getPriorityClip();
			if (!prio) return;
			clip = prio.clip;
			outside = prio.outside;
			//@ts-ignore
			const title = tileset.title;
			if (title && prio.unclippedTilesets.includes(title)) return;
		}
		this.remove3DTilesetClip(tileset);
		if (clip instanceof Cesium.ClippingPlaneCollection) {
			if (!tileset.clippingPlanes) tileset.clippingPlanes = new Cesium.ClippingPlaneCollection();
			for (let i = 0; i < clip.length; i++) {
				tileset.clippingPlanes.add(clip.get(i));
			}
			// Summary: Correct positioning of ClippingPlanes on a 3D Tileset:
			// 1. Get the inverse Matrix4 to transform objects to the reference point of clipping planes for the 3D tileset
			// 2. Bring the modelMatrix of the global clipping planes to the reference point of the 3D tileset from 1.
			// 3. Apply to the clipping planes of the 3D tileset
			//@ts-ignore
			const centerInverseTransform = Cesium.Matrix4.inverseTransformation(tileset.clippingPlanesOriginMatrix, new Cesium.Matrix4());
			const modMat = Cesium.Matrix4.multiplyTransformation(centerInverseTransform, clip.modelMatrix, new Cesium.Matrix4());
			tileset.clippingPlanes.modelMatrix = modMat;
			tileset.clippingPlanes.unionClippingRegions = clip.unionClippingRegions;
			this.map.refresh();
		}
		else {
			tileset.clippingPolygons = new Cesium.ClippingPolygonCollection({ 
				polygons: clip,
				inverse: outside 
			});
		}
	}

	private set3DTilesetClippingPlanes(clip: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon>, outside: boolean, unclippedTilesets: Array<string> = []): void {
		const primitives = this.map.viewer.scene.primitives;
		for (let i = 0; i < primitives.length; i++) {
			const primitive = primitives.get(i);
			if (unclippedTilesets.includes(primitive.title)) continue;
			if (primitive instanceof Cesium.Cesium3DTileset) {
				this.clip3DTileset(primitive, clip, outside);
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

	private clipOnLayerAdded = (e: unknown) => {
		const layerConfig = e as LayerConfig;
		const layer = this.map.getLayerById(layerConfig.id);
		if (layer instanceof ThreedeeLayer) {
			layer.ensureLoaded().then(() => {
				this.map.clipHandler.clip3DTileset(layer.source);
			});
		}
	}

	private clip3DTilesetByTitles(titles: Array<string>): void {
		const primitives = this.map.viewer.scene.primitives;
		for (let i = 0; i < primitives.length; i++) {
			const primitive = primitives.get(i);
			if (titles.includes(primitive.title)) {
				this.clip3DTileset(primitive);
			}
		}
	}

	private remove3DTilesetClip(tileset: Cesium.Cesium3DTileset): void {
		tileset.clippingPlanes?.removeAll();
		tileset.clippingPolygons?.removeAll();
		//@ts-ignore
		tileset.clippingPolygons = undefined;
	}

	public removeAll3DTilesetClips(): void {
		const primitives = this.map.viewer.scene.primitives;
		for (let i = 0; i < primitives.length; i++) {
			const primitive = primitives.get(i);
			this.remove3DTilesetClip(primitive);
		}
	}

	private async addBox(polygons: Array<Array<[lon: number, lat: number]>>): Promise<void> {
		await this.addStandardBox(polygons);
	}

	private async addStandardBox(polygons: Array<Array<[lon: number, lat: number]>>): Promise<void> {
		const geometryInstances: Array<Cesium.GeometryInstance> = [];
		const promises = polygons.map(async(polygon) => {
			const surfaceArea = turf.area(turf.polygon([polygon]));
			let wallDepth = Math.max(Math.sqrt(surfaceArea) * -0.15, -1 * this.wallDepth);
			let polygonC3 = polygonToCartesians(polygon);
			if (this.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
				const { positions, averageHeight } = await getPolygonOnTerrain(this.map.viewer.terrainProvider, polygonC3, 1000);
				polygonC3 = positions;
				wallDepth += averageHeight;
			}
			const wall = new Cesium.GeometryInstance({
				geometry: new Cesium.WallGeometry({
					positions: polygonC3,
					minimumHeights: new Array(polygonC3.length).fill(wallDepth)
				})
			});
			const bottom = new Cesium.GeometryInstance({
				geometry: new Cesium.PolygonGeometry({
					polygonHierarchy: new Cesium.PolygonHierarchy(polygonC3),
					height: wallDepth
				})
			});
			geometryInstances.push(wall, bottom);
		});
		await Promise.all(promises);

		const soilAppearance = new Cesium.MaterialAppearance({
			material: Cesium.Material.fromType('Color', {
				color: new Cesium.Color(1.0, 1.0, 1.0, 1.0)
				}),
			translucent: false,
			/*material: Cesium.Material.fromType("Color", {
				color: Cesium.Color.LIGHTGREY
			})*/
		});

		const box = geometryInstances.length === 0  ? undefined : new Cesium.Primitive({
			geometryInstances: geometryInstances,
			appearance: soilAppearance,
			allowPicking: false
		});
		if (box) {
			this.map.viewer.scene.primitives.add(box);
			this.globeOpacityUnsubscriber?.();
			this.globeOpacityUnsubscriber = this.map.options.globeOpacity.subscribe((opacity) => {
				soilAppearance.material.uniforms.color.alpha = opacity / 100;
			});
		}
		if (this.box) this.map.viewer.scene.primitives.remove(this.box);
		this.box = box;
	}


}


/** Pass batchId to fragment shader
 * batchId 0 = wall
 * batchId 1 = bottom
**/
const boxVS = `
	in vec3 position3DHigh;
	in vec3 position3DLow;
	in vec3 normal;
	in vec2 st;
	in float batchId;

	out vec3 v_positionEC;
	out vec3 v_normalEC;
	out vec2 v_st;
	out float v_batchId;

	void main() {
		vec4 p = czm_computePosition();

		v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
		v_normalEC = czm_normal * normal;                         // normal in eye coordinates
		v_st = st;
		v_batchId = batchId;

		gl_Position = czm_modelViewProjectionRelativeToEye * p;
	}
`;
// Fragment shader: apply a radial alpha to the bottom of the box
const boxFS = `
	#define FACE_FORWARD

	in float v_batchId;

	czm_material czm_getMaterialRadial(czm_materialInput materialInput, float radialApha) {
		czm_material material = czm_getDefaultMaterial(materialInput);
		material.diffuse = czm_gammaCorrect(texture(image_0, fract(repeat_1 * materialInput.st)).rgb * color_2.rgb); 
		material.alpha = texture(image_0, fract(repeat_1 * materialInput.st)).a * color_2.a * radialApha; 
		return material;
	}

	in vec3 v_positionEC;
	in vec3 v_normalEC;
	in vec2 v_st;

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
		float radialApha = 1.0;
		if (v_batchId > 0.0) {
			float maxDist = max(abs(v_st.x - 0.5), abs(v_st.y - 0.5));
			radialApha = smoothstep(0.0, 1.0, (maxDist - 0.12) * 3.2);
		}
		czm_material material = czm_getMaterialRadial(materialInput, radialApha);

	#ifdef FLAT
		out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
	#else
		out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
	#endif
	}
`;