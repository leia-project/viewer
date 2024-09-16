import * as Cesium from "cesium";
import { Delaunay } from "d3-delaunay";
import type { Map } from "../map";

import type { Unsubscriber } from "svelte/motion";
import { get, writable, type Writable } from "svelte/store";
import { PrimitiveLayer } from "./primitive-layer";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import LayerControlFlood from "$lib/components/map-cesium/LayerControlFlood/LayerControlFlood.svelte";
import { CesiumLayer } from "./cesium-layer";

interface FloodLayerContents {
	name: string,
	terrain: {
		scaling: {
			min: number,
			max: number,
		}
		path: string
	},
	flood_planes: {
		scaling: {
			min: number,
			max: number,
		},
		paths: Array<string>
	}
}

interface DynamicWaterLevelOptions {
	map: Map;
	time: number;
	sw: [lon: number, lat: number];
	ne: [lon: number, lat: number];
	gridSpacingInMeters: number;
	url: string;
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
	private baseUrl: string;
	public waterLevels: Array<WaterLevel> = [];
	public imagesLoaded: Promise<boolean>;
	public time: Writable<number>;
	public primitive?: Cesium.Primitive;
	public alpha: Writable<number>;
	private contents: Promise<FloodLayerContents>;
	private material?: Cesium.Material;
	private timeUnsubscriber?: Unsubscriber;
	private alphaUnsubscriber?: Unsubscriber;
	private verticalExaggeration: Writable<number>;
	private verticalExaggerationUnsubscriber?: Unsubscriber;
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

	constructor (options: DynamicWaterLevelOptions) {
		this.map = options.map;
		this.time = writable(options.time);
		this.gridSpacingInMeters = options.gridSpacingInMeters;
		this.sw = options.sw;
		this.ne = options.ne;
		this.baseUrl = options.url.substring(0, options.url.lastIndexOf("/") + 1);
		this.verticalExaggeration = writable(1);
		this.alpha = writable(0.8);
		this.contents = this.loadContents(options.url);
		this.imagesLoaded = this.loadImages(options.url);
	}

	private async loadContents(url: string): Promise<FloodLayerContents> {
		return fetch(url).then((response) => response.json());
	}

	public async load(): Promise<void> {
		if (!this.primitive) await this.createMesh();
		this.timeUnsubscriber = this.time.subscribe(() => this.setUniforms());
		this.alphaUnsubscriber = this.alpha.subscribe(() => this.setUniforms());
		this.verticalExaggerationUnsubscriber = this.verticalExaggeration.subscribe((value) => {
			if (this.material) this.material.uniforms.u_vertical_exaggeration = value;
		});
	}

	public remove(): void {
		if (!this.primitive) return;
		this.timeUnsubscriber?.();
		this.alphaUnsubscriber?.();
		this.verticalExaggerationUnsubscriber?.();
	}

	private async loadImages(url: string): Promise<boolean> {
		const contents = await this.contents;
		const terrainImage = await this.loadImage(contents.terrain.path);
		if (!terrainImage) {
			throw new Error("Failed to load terrain image");
		}
		this.uniformMap.uTerrain.value = terrainImage;
		const loadWaterLevelPromises = contents.flood_planes.paths.map(async (path: string, i: number) => {
			const image = await this.loadImage(path);
			if (!image) {
				throw new Error("Failed to load terrain image");
			}
			if (image) return { time: i, image: image };
		});
		const loadedWaterLevels = await Promise.all(loadWaterLevelPromises);
		for (const waterLevel of loadedWaterLevels) {
			if (waterLevel) {
				this.waterLevels.push(waterLevel);
			}
		}
		this.setUniforms();
		return true;
	}

	private async loadImage(path: string): Promise<ImageBitmap | HTMLImageElement | undefined> {
		const resource = await Cesium.Resource.fetchImage({url: this.baseUrl + path});
		return resource;
	}

	private async setUniforms(): Promise<void> {
		const [lowerBound, upperBound] = this.findClosestWaterLevels();
		if (!lowerBound || !upperBound) return;
		this.uniformMap.uElevationT1.value = lowerBound.image;
		this.uniformMap.uElevationT2.value = upperBound.image;

		let progress: number = 1;
		if (upperBound.time !== lowerBound.time) {
			progress = (get(this.time) - lowerBound.time) / (upperBound.time - lowerBound.time);
		}
		this.uniformMap.uProgress.value = progress;

		if (this.material) {
			this.material.uniforms.u_progress = this.uniformMap.uProgress.value;
			this.material.uniforms.u_terrain = this.uniformMap.uTerrain.value;
			this.material.uniforms.u_elevation_t1 = this.uniformMap.uElevationT1.value;
			this.material.uniforms.u_elevation_t2 = this.uniformMap.uElevationT2.value;
			this.material.uniforms.u_alpha = get(this.alpha);
		}
		this.map.refresh();
	}

	private findClosestWaterLevels(): [WaterLevel, WaterLevel] {
		let lowerBound = this.waterLevels[0];
		let upperBound = this.waterLevels[this.waterLevels.length - 1];
		for (const waterLevel of this.waterLevels) {
			if (waterLevel.time < get(this.time)) {
				lowerBound = waterLevel;
			} else if (waterLevel.time > get(this.time)) {
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
	
	private async createMesh(): Promise<void> {
		await this.imagesLoaded;
		const contents = await this.contents;

		const terrainScalingMin = contents.terrain.scaling.min;
		const terrainScalingMax = contents.terrain.scaling.max;
		const floodPlaneScalingMin = contents.flood_planes.scaling.min;
		const floodPlaneScalingMax = contents.flood_planes.scaling.max;
		
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
			uniform float u_alpha_8;
			uniform float u_terrain_scaling_min_9;
			uniform float u_terrain_scaling_max_10;
			uniform float u_flood_plane_scaling_min_11;
			uniform float u_flood_plane_scaling_max_12;

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
				float elevation_t1 = texture(u_elevation_t1_2, _st).r * (u_flood_plane_scaling_max_12 - u_flood_plane_scaling_min_11) + u_flood_plane_scaling_min_11;
				float elevation_t2 = texture(u_elevation_t2_3, _st).r * (u_flood_plane_scaling_max_12 - u_flood_plane_scaling_min_11) + u_flood_plane_scaling_min_11;
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
                float elevation_t1 = texture(u_elevation_t1_2, _st).r * (u_flood_plane_scaling_max_12 - u_flood_plane_scaling_min_11) + u_flood_plane_scaling_min_11;
                float elevation_t2 = texture(u_elevation_t2_3, _st).r * (u_flood_plane_scaling_max_12 - u_flood_plane_scaling_min_11) + u_flood_plane_scaling_min_11;
                float elevation = mix(elevation_t1, elevation_t2, u_progress_0);
                return elevation;
            }
 
            czm_material sdg_czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                material.diffuse = czm_gammaCorrect(v_color * vec3(1.0));
                material.alpha = u_alpha_8;
                material.specular = 0.0;
                material.shininess = 0.0;
                return material;
            }
           
            void main() {

				float terrain_height = texture(u_terrain_1, v_st).r * (u_terrain_scaling_max_10 - u_terrain_scaling_min_9) + u_terrain_scaling_min_9;
				float elevation = computeElevation(v_st);
				if (elevation == u_flood_plane_scaling_min_11 || terrain_height == u_terrain_scaling_min_9) {
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
					u_vertical_exaggeration: get(this.verticalExaggeration),
					u_alpha: get(this.alpha),
					u_terrain_scaling_min: terrainScalingMin,
					u_terrain_scaling_max: terrainScalingMax,
					u_flood_plane_scaling_min: floodPlaneScalingMin,
					u_flood_plane_scaling_max: floodPlaneScalingMax
				}
			},
			translucent: true,
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
			translucent: true,
			flat: false,
			faceForward: false,
			closed: false,
			renderState: renderState
		});

		this.primitive = new Cesium.Primitive({
			geometryInstances: [instance],
			asynchronous: false,
			appearance: appearance,
			shadows: Cesium.ShadowMode.DISABLED
		});
	}

}


export class FloodLayer extends CesiumLayer<PrimitiveLayer> {

	private plane: DynamicWaterLevel | undefined;
	private layerControl!: CustomLayerControl;
	public timeSliderMin: Writable<number> = writable(0);
	public timeSliderMax: Writable<number> = writable(1);
	public timeSliderStep: Writable<number> = writable(1);
	public timeSliderValue: Writable<number> = writable(0);
	public timeSliderLabel: string;
	private timeUnsubscriber!: Unsubscriber;
	public loaded: Promise<boolean>;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);

		this.plane = undefined;
		
		this.timeSliderLabel = "";

		this.addControl()
		this.addListeners()
		this.loaded = this.loadData();

	}

	private async loadData(): Promise<boolean> {

		const sw: [lon: number, lat: number] = [3.7144324, 51.3825071];
		const ne: [lon: number, lat: number] = [3.9378694, 51.4888285];
		const resolution: number = 100;

		this.plane = new DynamicWaterLevel({
			map: this.map,
			time: get(this.timeSliderMin),
			sw: sw,
			ne: ne,
			gridSpacingInMeters: resolution,
			url: this.config.settings.url,
		});

		await this.plane.load()
		if (this.plane) {
			this.timeSliderMax.set(this.plane.waterLevels.length);
			this.source = this.plane.primitive
		}
		return true;
	}

	public async addToMap(): Promise<void> {
		await this.loaded;
		this.map.viewer.scene.primitives.add(this.source);
		if (get(this.visible) === true) {
			this.show();
			this.map.refresh();
		} else {
			this.hide();
			this.map.refresh();
		}
	}

	public removeFromMap(): void {
		this.removeControl();
		this.timeUnsubscriber();
		this.plane?.remove();
		this.map.viewer.scene.primitives.remove(this.source);
	}

	public show(): void {
		if (!this.loaded) return;
        if (this.plane?.primitive !== undefined) this.plane.primitive.show = true
    }

    public hide(): void {
        if (!this.loaded) return;
        if (this.plane?.primitive !== undefined) this.plane.primitive.show = false
    }

	private addControl(): void {
		this.layerControl = new CustomLayerControl();
		this.layerControl.component = LayerControlFlood;
		this.layerControl.props = {
			layer: this,
			map: this.map,
		};
		this.addCustomControl(this.layerControl);
	}

	private removeControl(): void {
		this.removeCustomControl(this.layerControl);
	}

	private addListeners(): void {
		this.timeUnsubscriber = this.timeSliderValue.subscribe((value: number) => {
			this.plane?.time.set(value);
		});
	}

	public opacityChanged(opacity: number): void {
		if (this.plane) {
			this.plane.alpha.set(opacity > 100 ? 1.0 : opacity < 0 ? 0 : opacity / 100);
		}
	}
}

