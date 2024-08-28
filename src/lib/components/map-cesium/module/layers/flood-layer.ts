import * as Cesium from "cesium";
import { Delaunay } from "d3-delaunay";
import type { Map } from "../map";

import type { Unsubscriber } from "svelte/motion";
import { get, writable, type Writable } from "svelte/store";
import { PrimitiveLayer } from "./primitive-layer";
import type { LayerConfig } from "$lib/components/map-core/layer-config";

interface DynamicWaterLevelOptions {
	map: Map;
	sw: [lon: number, lat: number];
	ne: [lon: number, lat: number];
	gridSpacingInMeters: number;
	terrain: string;
	waterLevels: Array<{
		time: number,
		image: string
	}>;
}

interface WaterLevel {
	time: number;
	image: ImageBitmap | HTMLImageElement;
}

class DynamicWaterLevel {

	private map: Map;
	private gridSpacingInMeters: number;
	private sw: [lon: number, lat: number];
	private ne: [lon: number, lat: number];

	private waterLevels: Array<WaterLevel> = [];
	public imagesLoaded: Promise<void>;

	private uniformMap: any = {
		uProgress: {
			type: "float",
			value: 0
		},
		uTerrain: {
			type: "sampler2D",
			value: undefined
		},
		uElevationT1: {
			type: "sampler2D",
			value: undefined
		},
		uElevationT2: {
			type: "sampler2D",
			value: undefined
		}
	
	};
	private primitive?: Cesium.Primitive;
	private material?: Cesium.Material;
	private timeUnsubscriber?: Unsubscriber;
	private verticalExaggeration: Writable<number> ;
	private verticalExaggerationUnsubscriber?: Unsubscriber;

	constructor (options: DynamicWaterLevelOptions) {
		this.map = options.map;
		this.gridSpacingInMeters = options.gridSpacingInMeters;
		this.sw = options.sw;
		this.ne = options.ne;
		this.imagesLoaded = this.loadImages(options.terrain, options.waterLevels);
		this.verticalExaggeration = writable(1);
	}

	public async add(): Promise<void> {
		if (!this.primitive) await this.construct();
		this.map.viewer.scene.primitives.add(this.primitive);
		this.timeUnsubscriber = this.map.options.dateTime.subscribe((time) => this.setUniforms(time));
		this.verticalExaggerationUnsubscriber = this.verticalExaggeration.subscribe((value) => {
			if (this.material) this.material.uniforms.u_vertical_exaggeration = value;
		});
	}

	public remove(): void {
		if (!this.primitive) return;
		this.map.viewer.scene.primitives.remove(this.primitive);
		this.timeUnsubscriber?.();
		this.verticalExaggerationUnsubscriber?.();
	}

	private async loadImages(terrain: string, waterLevels: Array<{time: number, image: string}>): Promise<void> {
		const terrainImage = await this.loadImage(terrain);
		if (!terrainImage) {
			throw new Error("Failed to load terrain image");
		}
		this.uniformMap.uTerrain.value = terrainImage;
		const loadWaterLevelPromises = waterLevels.map(async (waterLevel) => {
			const image = await this.loadImage(waterLevel.image);
			if (image) return { time: waterLevel.time, image: image };
		});
		const loadedWaterLevels = await Promise.all(loadWaterLevelPromises);
		for (const waterLevel of loadedWaterLevels) {
			if (waterLevel) {
				this.waterLevels.push(waterLevel);
			}
		}
		this.setUniforms(get(this.map.options.dateTime));
	}

	private async loadImage(imageUrl: string): Promise<ImageBitmap | HTMLImageElement | undefined> {
		const resource = await Cesium.Resource.fetchImage({url: imageUrl});
		return resource;
	}

	private async setUniforms(time: number): Promise<void> {
		const [lowerBound, upperBound] = this.findClosestWaterLevels(time);
		if (!lowerBound || !upperBound) return;
		this.uniformMap.uElevationT1.value = lowerBound.image;
		this.uniformMap.uElevationT2.value = upperBound.image;

		let progress: number = 1;
		if (upperBound.time !== lowerBound.time) {
			progress = (time - lowerBound.time) / (upperBound.time - lowerBound.time);
		}
		this.uniformMap.uProgress.value = progress;

		if (this.material) {
			this.material.uniforms.u_progress = this.uniformMap.uProgress.value;
			this.material.uniforms.u_terrain = this.uniformMap.uTerrain.value;
			this.material.uniforms.u_elevation_t1 = this.uniformMap.uElevationT1.value;
			this.material.uniforms.u_elevation_t2 = this.uniformMap.uElevationT2.value;
		}
	}

	private findClosestWaterLevels(time: number): [WaterLevel, WaterLevel] {
		let lowerBound = this.waterLevels[0];
		let upperBound = this.waterLevels[this.waterLevels.length - 1];
		for (const waterLevel of this.waterLevels) {
			if (waterLevel.time < time) {
				lowerBound = waterLevel;
			} else if (waterLevel.time > time) {
				upperBound = waterLevel;
				break;
			}
		}
		return [lowerBound, upperBound];
	}

	private metersToDegrees(lat: number, meters: number) {
		const latMetersPerDegree = 111320;
		const lonMetersPerDegree = 111320 * Math.cos(lat * Math.PI / 180);
		const latDegrees = meters / latMetersPerDegree;
		const lonDegrees = meters / lonMetersPerDegree;
		return { latDegrees, lonDegrees };
	}
	

	private async construct(): Promise<void> {
		await this.imagesLoaded;
		
		const lonStart = this.sw[0];
		const latStart = this.sw[1];
		const lonEnd = this.ne[0];
		const latEnd = this.ne[1];

		const modelOrigin = Cesium.Cartesian3.fromDegrees((lonStart + lonEnd) / 2, (latStart + latEnd) / 2, 0);
		const modelNormal = Cesium.Cartesian3.normalize(modelOrigin, new Cesium.Cartesian3());

		const { latDegrees, lonDegrees } = this.metersToDegrees((latStart + latEnd) / 2, this.gridSpacingInMeters);

        const lonSteps = Math.ceil((lonEnd - lonStart) / lonDegrees);
        const latSteps = Math.ceil((latEnd - latStart) / latDegrees);

        const coordinates2D: Array<[lon: number, lat: number]> = [];

        for (let i = 0; i <= lonSteps; i++) {
            for (let j = 0; j <= latSteps; j++) {
                const lon = lonStart + i * lonDegrees;
                const lat = latStart + j * latDegrees;
                coordinates2D.push([lon, lat]);
            }
        }
        const delaunay = Delaunay.from(coordinates2D);
        const triangles = delaunay.triangles;

		const pos = new Float64Array(triangles.length * 3);
		const st = new Float32Array(triangles.length * 2);
		//const indices = new Uint32Array(triangles);

		for (let i = 0; i < triangles.length; i += 3) {
			const vertexIndex1 = triangles[i];
			const vertexIndex2 = triangles[i + 1];
			const vertexIndex3 = triangles[i + 2];
			
			const vertex1 = Cesium.Cartesian3.fromDegrees(coordinates2D[vertexIndex1][0], coordinates2D[vertexIndex1][1], 0);
			const vertex2 = Cesium.Cartesian3.fromDegrees(coordinates2D[vertexIndex2][0], coordinates2D[vertexIndex2][1], 0);
			const vertex3 = Cesium.Cartesian3.fromDegrees(coordinates2D[vertexIndex3][0], coordinates2D[vertexIndex3][1], 0);

			const vertices = [vertex1, vertex2, vertex3];
			for (let j = 0; j < 3; j++) {
				pos[(i + j) * 3] = vertices[j].x;
				pos[(i + j) * 3 + 1] = vertices[j].y;
				pos[(i + j) * 3 + 2] = vertices[j].z;
			}

			const uv1 = [
				(coordinates2D[vertexIndex1][0] - lonStart) / (lonEnd - lonStart),
				(coordinates2D[vertexIndex1][1] - latStart) / (latEnd - latStart)
			];
			const uv2 = [
				(coordinates2D[vertexIndex2][0] - lonStart) / (lonEnd - lonStart),
				(coordinates2D[vertexIndex2][1] - latStart) / (latEnd - latStart)
			];
			const uv3 = [
				(coordinates2D[vertexIndex3][0] - lonStart) / (lonEnd - lonStart),
				(coordinates2D[vertexIndex3][1] - latStart) / (latEnd - latStart)
			];
			const uvs = [uv1, uv2, uv3];
			for (let j = 0; j < 3; j++) {
				st[(i + j) * 2] = uvs[j][0];
				st[(i + j) * 2 + 1] = uvs[j][1];
			}
		}
		
		const geometry = new Cesium.Geometry({
			vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
			//@ts-ignore
			attributes: {
				position: new Cesium.GeometryAttribute({
					componentDatatype: Cesium.ComponentDatatype.DOUBLE, // not FLOAT
					componentsPerAttribute: 3,
					values: pos
				}),
				st: new Cesium.GeometryAttribute({
					componentDatatype: Cesium.ComponentDatatype.FLOAT,
					componentsPerAttribute: 2,
					values: st
				})
			},
			primitiveType: Cesium.PrimitiveType.TRIANGLES,
			boundingSphere: Cesium.BoundingSphere.fromVertices(Array.from(pos))
			//indices: indices,
			//modelMatrix: Cesium.Matrix4.IDENTITY		
		});
		Cesium.GeometryPipeline.compressVertices(geometry);

		const instance = new Cesium.GeometryInstance({
			geometry: geometry,
			modelMatrix: Cesium.Matrix4.IDENTITY
		});

		const vertexShader = `
			uniform float u_progress_0;
			uniform sampler2D u_terrain_1;
			uniform sampler2D u_elevation_t1_2;
			uniform sampler2D u_elevation_t2_3;
			uniform vec3 u_model_normal_4;
			uniform float u_texel_size_s_5;
			uniform float u_texel_size_t_6;
			uniform float u_vertical_exaggeration_7;

			in vec3 position3DHigh;
			in vec3 position3DLow;
			in vec3 normal;
			in vec2 st;
			in float batchId;

			out vec3 v_positionEC;
			out vec3 v_normalEC;
			out vec2 v_st;
			out vec3 v_color;

			float computeElevation(vec2 _st) {
				_st = clamp(_st, vec2(0.0), vec2(1.0));
				float elevation_t1 = texture(u_elevation_t1_2, _st).r * (50.0 - 40.0) + 40.0;
				float elevation_t2 = texture(u_elevation_t2_3, _st).r * (50.0 - 40.0) + 40.0;
				float elevation = mix(elevation_t1, elevation_t2, u_progress_0);
				return elevation;
			}

			vec3 computeNormalFromNeighbors() {
				float left = computeElevation(st - vec2(u_texel_size_s_5, 0.0));
				float right = computeElevation(st + vec2(u_texel_size_s_5, 0.0));
				float up = computeElevation(st + vec2(0.0, u_texel_size_t_6));
				float down = computeElevation(st - vec2(0.0, u_texel_size_t_6));	

				vec3 tangent1 = vec3(u_texel_size_s_5, 0.0, right - left);
				vec3 tangent2 = vec3(0.0, u_texel_size_t_6, up - down);
				vec3 normal = normalize(cross(tangent1, tangent2));
				normal *= 1.0;
				return normal;
			}

			void main() {
                vec4 p = czm_computePosition();
 
                float terrain_height = texture(u_terrain_1, st).r;
                float elevation = computeElevation(st);
				float height_to_terrain = elevation - terrain_height;
               
                // Height exaggeration relative to terrain:
				p.xyz += u_model_normal_4 * (terrain_height + height_to_terrain * u_vertical_exaggeration_7);
 
                vec3 computedNormal = computeNormalFromNeighbors();
 
                v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
                v_normalEC = czm_normal * computedNormal;
                v_st = st;
 
                gl_Position = czm_modelViewProjectionRelativeToEye * p;
            }
		`;
		
		const fragmentShader = `
            in vec3 v_positionEC;
            in vec3 v_normalEC;
            in vec2 v_st;
            vec3 v_color;
 
           
            float computeElevation(vec2 _st) {
                _st = clamp(_st, vec2(0.0), vec2(1.0));
                float elevation_t1 = texture(u_elevation_t1_2, _st).r * (50.0 - 40.0) + 40.0;
                float elevation_t2 = texture(u_elevation_t2_3, _st).r * (50.0 - 40.0) + 40.0;
                float elevation = mix(elevation_t1, elevation_t2, u_progress_0);
                return elevation;
            }
 
            czm_material sdg_czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                material.diffuse = czm_gammaCorrect(v_color * vec3(1.0));
                material.alpha = 0.8;
                material.specular = 0.0;
                material.shininess = 0.0;
                return material;
            }
           
            void main() {

				float terrain_height = texture(u_terrain_1, v_st).r * (90.0 - 30.0) + 30.0;
				float elevation = computeElevation(v_st);
				if (elevation == 0.0 || terrain_height == 0.0) {
					discard;
				}
				float height_to_terrain = elevation - terrain_height;
				v_color = mix(vec3(0.522, 0.631, 0.737), vec3(0.0, 0.301, 0.600), height_to_terrain);
 
                vec3 positionToEyeEC = -v_positionEC;
 
                vec3 normalEC = normalize(v_normalEC);
            #ifdef FACE_FORWARD
                normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
            #endif
 
                czm_materialInput materialInput;
                materialInput.normalEC = normalEC;
                materialInput.positionToEyeEC = positionToEyeEC;
                //materialInput.st = v_st;
                czm_material material = sdg_czm_getMaterial(materialInput);
               
            #ifdef FLAT
                out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
            #else
                out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
            #endif
            }
        `;

		this.material = new Cesium.Material({
			fabric: {
				type : 'CustomDynamicPlaneMaterial',
				uniforms: {
					u_progress: this.uniformMap.uProgress.value,
					u_terrain: this.uniformMap.uTerrain.value,
					u_elevation_t1: this.uniformMap.uElevationT1.value,
					u_elevation_t2: this.uniformMap.uElevationT2.value,
					u_model_normal: modelNormal,
					u_texel_size_s: 1 / lonSteps,
					u_texel_size_t: 1 / latSteps,
					u_vertical_exaggeration: get(this.verticalExaggeration)
				}
			},
			translucent: false,
			minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
			magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST
		});

		// @ts-ignore
		const renderState = Cesium.RenderState.fromCache({
			depthTest: {
				enabled: true,
			},
			blending: Cesium.BlendingState.ALPHA_BLEND,
			//frontFace: Cesium.WindingOrder.CLOCKWISE,
			cull: {
				enabled: false,
				face: Cesium.CullFace.BACK
			}
		});

		const appearance = new Cesium.MaterialAppearance({
			material: this.material,
			vertexShaderSource: vertexShader,
			fragmentShaderSource: fragmentShader,
			translucent: false,
			flat: false,
			faceForward: false,
			closed: false,
			renderState: renderState
		});
		//Console log the shaders:
		//console.log(appearance.vertexShaderSource);
		//console.log(appearance.getFragmentShaderSource());

		this.primitive = new Cesium.Primitive({
			geometryInstances: instance,
			asynchronous: false,
			appearance: appearance,
			shadows: Cesium.ShadowMode.DISABLED
		});
	}

}


export class FloodLayer extends PrimitiveLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.loadDynamicWaterLevel();
	}

	private async loadDynamicWaterLevel(): Promise<void> {

		const sw: [lon: number, lat: number] = [3.7144324, 51.3825071];
		const ne: [lon: number, lat: number] = [3.9378694, 51.4888285];
		const resolution: number = 100;

		const plane = new DynamicWaterLevel({
			map: this.map,
			sw: sw,
			ne: ne,
			gridSpacingInMeters: resolution,
			terrain: "https://virtueel.zeeland.nl/tiles_other/flood_borssele/ahn.jpg",
			waterLevels: [
				{
					time: 1720602000000,
					image: "https://virtueel.zeeland.nl/tiles_other/flood_borssele/00002.jpg"
				},
				{
					time: 1720602000000 + (60 * 60 * 1000) * 3,
					image: "https://virtueel.zeeland.nl/tiles_other/flood_borssele/00014.jpg"
				},
				{
					time: 1720602000000 + (60 * 60 * 1000) * 6,
					image: "https://virtueel.zeeland.nl/tiles_other/flood_borssele/00036.jpg"
				},
				{
					time: 1720602000000 + (60 * 60 * 1000) * 9,
					image: "https://virtueel.zeeland.nl/tiles_other/flood_borssele/00049.jpg"
				}
			]
		});
		plane.add();
		const location = [3.90962, 51.49435];
		setTimeout(() => {
			this.map.viewer.camera.setView({
				destination: Cesium.Cartesian3.fromDegrees(location[0], location[1], 40000),
				orientation: {
					heading: Cesium.Math.toRadians(0),
					pitch: Cesium.Math.toRadians(-90),
					roll: 0
				}
			});
		}, 1000);
	}
}

