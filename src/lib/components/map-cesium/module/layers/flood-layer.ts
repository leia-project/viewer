import { get, writable, type Writable, type Unsubscriber } from "svelte/store";
import * as Cesium from "cesium";
import { Delaunay } from "d3-delaunay";
import type { Map } from "../map";

import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import LayerControlFlood from "$lib/components/map-cesium/LayerControlFlood/LayerControlFlood.svelte";
import { CesiumLayer } from "./cesium-layer";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import type { Breach } from "../../MapToolFlooding/layer-controller";


interface FloodLayerContents {
	name: string,
	sw: [number, number],
	ne: [number, number],
	terrain: {
		scaling: {
			min: number,
			max: number,
		}
		path: string
	},
	flood_planes: {
		class_mapping: object,
		paths: Array<string>
	}
}

interface DynamicWaterLevelOptions {
	map: Map;
	gridSpacingInMeters: number;
	url: string;
	alpha: number;
}

interface WaterLevel {
	time: number;
	image: ImageBitmap | HTMLImageElement;
}

class DynamicWaterLevel {

	private map: Map;
	private gridSpacingInMeters: number;
	private baseUrl: URL;
	public waterLevels: Array<WaterLevel> = [];
	public time: Writable<number>;
	public primitive?: Cesium.Primitive;
	public alpha: Writable<number>;
	public contents?: FloodLayerContents;
	private material?: Cesium.Material;
	private timeUnsubscriber?: Unsubscriber;
	private alphaUnsubscriber?: Unsubscriber;
	private verticalExaggeration: Writable<number>;
	private verticalExaggerationUnsubscriber?: Unsubscriber;
	private uniformMap: any = {
		uTerrain: {
			type: "sampler2D",
			value: undefined
		},
		uFloodSlot1: {
			type: "sampler2D",
			value: undefined
		},
		uFloodSlot2: {
			type: "sampler2D",
			value: undefined
		},
		uFloodSlot3: {
			type: "sampler2D",
			value: undefined
		},
		uFloodSlot4: {
			type: "sampler2D",
			value: undefined
		}
	};

	private floodTextureMapping: Array<{ slot: number, time?: number, image: any}> = [
		{ slot: 1, time: undefined, image: undefined },
		{ slot: 2, time: undefined, image: undefined },
		{ slot: 3, time: undefined, image: undefined },
		{ slot: 4, time: undefined, image: undefined }
	];

	constructor(options: DynamicWaterLevelOptions) {
		this.map = options.map;
		this.time = writable(0);
		this.gridSpacingInMeters = options.gridSpacingInMeters;
		this.baseUrl = new URL(options.url);
		this.verticalExaggeration = writable(1);
		this.alpha = writable(options.alpha);
		this.addListeners();
	}

	public addListeners(): void {
		this.timeUnsubscriber = this.time.subscribe(() => this.setUniforms());
		this.alphaUnsubscriber = this.alpha.subscribe(() => this.setUniforms());
		this.verticalExaggerationUnsubscriber = this.verticalExaggeration.subscribe((value) => {
			if (this.material) this.material.uniforms.u_vertical_exaggeration = value;
		});
	}

	public removeListeners(): void {
		this.timeUnsubscriber?.();
		this.alphaUnsubscriber?.();
		this.verticalExaggerationUnsubscriber?.();
	}

	public async load(endpoint: string): Promise<void> {
		const scenarioUrl = new URL(endpoint, this.baseUrl);
		this.contents = await this.loadContents(`${scenarioUrl.href}/layer.json`);
		await this.loadImages(scenarioUrl, this.contents);
		this.setUniforms(true);
		await this.createMesh(this.contents);
	}

	private async loadContents(url: string): Promise<FloodLayerContents> {
		return fetch(url).then((response) => response.json());
	}

	private async loadImages(scenarioUrl: URL, contents: FloodLayerContents): Promise<boolean> {
		const terrainImage = await this.loadImage(`${scenarioUrl.href}/${contents.terrain.path}`);
		if (!terrainImage) {
			throw new Error("Failed to load terrain image");
		}
		this.uniformMap.uTerrain.value = terrainImage;
		const loadWaterLevelPromises = contents.flood_planes.paths.map(async (path: string, i: number) => {
			const image = await this.loadImage(`${scenarioUrl.href}/${path}`);
			if (!image) {
				throw new Error("Failed to load terrain image");
			}
			if (image) return { time: i, image: image };
		});
		const loadedWaterLevels = await Promise.all(loadWaterLevelPromises);
		this.waterLevels = [];
		for (const waterLevel of loadedWaterLevels) {
			if (waterLevel) {
				this.waterLevels.push(waterLevel);
			}
		}
		return true;
	}

	private async loadImage(url: string): Promise<ImageBitmap | HTMLImageElement | undefined> {
		const resource = await Cesium.Resource.fetchImage({ url });
		return resource;
	}

	private async setUniforms(reset: boolean = false): Promise<void> {
		if (reset) {
			this.floodTextureMapping = [
				{ slot: 1, time: undefined, image: undefined },
				{ slot: 2, time: undefined, image: undefined },
				{ slot: 3, time: undefined, image: undefined },
				{ slot: 4, time: undefined, image: undefined }
			];
		}
		const setTextureSlot = (slot: number, image: any) => {
			if (!this.material) return;
			if (slot === 1) this.material.uniforms.u_flood_slot_1 = image;
			if (slot === 2) this.material.uniforms.u_flood_slot_2 = image;
			if (slot === 3) this.material.uniforms.u_flood_slot_3 = image;
			if (slot === 4) this.material.uniforms.u_flood_slot_4 = image;
		}

		const [lowerLowerBound, lowerBound, upperBound, upperUpperBound] = this.findClosestWaterLevels();
		if (lowerBound === undefined || !upperBound === undefined) return;

		let slotTextureT1: number;
		const textureT1 = this.floodTextureMapping.find((mapping) => mapping.time === lowerBound.time);
		if (!textureT1) {
			for (const mapping of this.floodTextureMapping) {
				if (mapping.time !== lowerBound.time && mapping.time !== upperBound.time) {
					mapping.time = lowerBound.time;
					mapping.image = lowerBound.image;
					break;
				}
			}
			slotTextureT1 = this.floodTextureMapping.find((mapping) => mapping.time === lowerBound.time)?.slot || 1;
			setTextureSlot(slotTextureT1, lowerBound.image);
			setTimeout(() => this.map.refresh(), 100); // Because of small delay in setting the texture
		} else {
			slotTextureT1 = textureT1.slot;
		}

		let slotTextureT2: number;
		const textureT2 = this.floodTextureMapping.find((mapping) => mapping.time === upperBound.time);
		if (!textureT2) {
			for (const mapping of this.floodTextureMapping) {
				if (mapping.time !== lowerBound.time && mapping.time !== upperBound.time) {
					mapping.time = upperBound.time;
					mapping.image = upperBound.image;
					break;
				}
			}
			slotTextureT2 = this.floodTextureMapping.find((mapping) => mapping.time === upperBound.time)?.slot || 2;
			setTextureSlot(slotTextureT2, upperBound.image);
			setTimeout(() => this.map.refresh(), 100); // Because of small delay in setting the texture
		} else {
			slotTextureT2 = textureT2.slot;
		}

		const availableSlots = this.floodTextureMapping.filter((mapping) => mapping.time !== lowerBound.time && mapping.time !== upperBound.time);
		availableSlots[0].time = lowerLowerBound.time; availableSlots[0].image = lowerLowerBound.image;
		availableSlots[1].time = upperUpperBound.time; availableSlots[1].image = upperUpperBound.image;

		setTextureSlot(availableSlots[0].slot, availableSlots[0].image);
		setTextureSlot(availableSlots[1].slot, availableSlots[1].image);

		this.uniformMap.uFloodSlot1.value = this.floodTextureMapping[0].image;
		this.uniformMap.uFloodSlot2.value = this.floodTextureMapping[1].image;
		this.uniformMap.uFloodSlot3.value = this.floodTextureMapping[2].image;
		this.uniformMap.uFloodSlot4.value = this.floodTextureMapping[3].image;

		let progress: number = 1;
		if (upperBound.time !== lowerBound.time) {
			progress = (get(this.time) - lowerBound.time) / (upperBound.time - lowerBound.time);
			progress = Math.max(0, Math.min(1, progress));
		}

		if (this.material) {
			this.material.uniforms.u_terrain = this.uniformMap.uTerrain.value;
			this.material.uniforms.u_progress = progress;
			this.material.uniforms.u_flood_t1 = slotTextureT1;
			this.material.uniforms.u_flood_t2 = slotTextureT2;
			this.material.uniforms.u_alpha = get(this.alpha);
		}
		this.map.refresh();
	}

	private findClosestWaterLevels(): [WaterLevel, WaterLevel, WaterLevel, WaterLevel] {
		let lowerBound = this.waterLevels[0];
		let upperBound = this.waterLevels[this.waterLevels.length - 1];
		for (const waterLevel of this.waterLevels) {
			if (waterLevel.time <= get(this.time)) {
				lowerBound = waterLevel;
			} else if (waterLevel.time > get(this.time)) {
				upperBound = waterLevel;
				break;
			}
		}
		const lowerLowerBound = this.waterLevels[Math.max(0, this.waterLevels.indexOf(lowerBound) - 1)];
		const upperUpperBound = this.waterLevels[Math.min(this.waterLevels.length - 1, this.waterLevels.indexOf(upperBound) + 1)];
		return [lowerLowerBound, lowerBound, upperBound, upperUpperBound];
	}

	private metersToDegrees(lat: number, meters: number) {
		const latMetersPerDegree = 111320;
		const lonMetersPerDegree = 111320 * Math.cos(lat * Math.PI / 180);
		const latDegrees = meters / latMetersPerDegree;
		const lonDegrees = meters / lonMetersPerDegree;
		return { latDegrees, lonDegrees };
	}
	
	private async createMesh(contents: FloodLayerContents): Promise<void> {
		const terrainScalingMin = contents.terrain.scaling.min;
		const terrainScalingMax = contents.terrain.scaling.max;
		const floodPlaneClassMapping = Object.values(contents.flood_planes.class_mapping).map(num => {
			return Number.isInteger(num) ? num.toFixed(1) : num.toString();
		});
		const lonStart = contents.sw[0];
		const latStart = contents.sw[1];
		const lonEnd = contents.ne[0];
		const latEnd = contents.ne[1];

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
		const computeDepth = `
			float flood_plane_class_mapping[${floodPlaneClassMapping.length}] = float[${floodPlaneClassMapping.length}](${floodPlaneClassMapping.join(",")});

			float computeDepth(vec2 _st) {
				_st = clamp(_st, vec2(0.0), vec2(1.0));

				float depth_t1 = 0.;
				if (u_flood_t1_6 == 1.) {
					depth_t1 = flood_plane_class_mapping[int(texture(u_flood_slot_1_2, _st).r * u_depth_value_max_15)];
				} else if (u_flood_t1_6 == 2.) {
					depth_t1 = flood_plane_class_mapping[int(texture(u_flood_slot_2_3, _st).r * u_depth_value_max_15)];
				} else if (u_flood_t1_6 == 3.) {
					depth_t1 = flood_plane_class_mapping[int(texture(u_flood_slot_3_4, _st).r * u_depth_value_max_15)];
				} else if (u_flood_t1_6 == 4.) {
					depth_t1 = flood_plane_class_mapping[int(texture(u_flood_slot_4_5, _st).r * u_depth_value_max_15)];
				}

				float depth_t2 = 0.;
				if (u_flood_t2_7 == 1.) {
					depth_t2 = flood_plane_class_mapping[int(texture(u_flood_slot_1_2, _st).r * u_depth_value_max_15)];
				} else if (u_flood_t2_7 == 2.) {
					depth_t2 = flood_plane_class_mapping[int(texture(u_flood_slot_2_3, _st).r * u_depth_value_max_15)];
				} else if (u_flood_t2_7 == 3.) {
					depth_t2 = flood_plane_class_mapping[int(texture(u_flood_slot_3_4, _st).r * u_depth_value_max_15)];
				} else if (u_flood_t2_7 == 4.) {
					depth_t2 = flood_plane_class_mapping[int(texture(u_flood_slot_4_5, _st).r * u_depth_value_max_15)];
				}

				float depth = mix(depth_t1, depth_t2, u_progress_0);
				return depth;
			}
		`;
		const vertexShader = `
			uniform float u_progress_0;
			uniform sampler2D u_terrain_1;
			uniform sampler2D u_flood_slot_1_2;
			uniform sampler2D u_flood_slot_2_3;
			uniform sampler2D u_flood_slot_3_4;
			uniform sampler2D u_flood_slot_4_5;
			uniform float u_flood_t1_6;
			uniform float u_flood_t2_7;

			uniform vec3 u_model_normal_8;
			uniform float u_texel_size_s_9;
			uniform float u_texel_size_t_10;
			uniform float u_vertical_exaggeration_11;
			uniform float u_alpha_12;
			uniform float u_terrain_scaling_min_13;
			uniform float u_terrain_scaling_max_14;
			uniform float u_depth_value_max_15;

			in vec3 position3DHigh;
			in vec3 position3DLow;
			in vec3 normal;
			in vec2 st;
			in float batchId;

			out vec3 v_positionEC;
			out vec3 v_normalEC;
			out vec2 v_st;
			out vec3 v_color;

			${computeDepth}

			vec3 computeNormalFromNeighbors() {
				float left = computeDepth(st - vec2(u_texel_size_s_9, 0.0));
				float right = computeDepth(st + vec2(u_texel_size_s_9, 0.0));
				float up = computeDepth(st + vec2(0.0, u_texel_size_t_10));
				float down = computeDepth(st - vec2(0.0, u_texel_size_t_10));	

				vec3 tangent1 = vec3(u_texel_size_s_9, 0.0, right - left);
				vec3 tangent2 = vec3(0.0, u_texel_size_t_10, up - down);
				vec3 normal = normalize(cross(tangent1, tangent2));
				normal *= 1.0;
				return normal;
			}

			void main() {
				vec4 p = czm_computePosition();
				float terrain_height = texture(u_terrain_1, st).r * (u_terrain_scaling_max_14 - u_terrain_scaling_min_13) + u_terrain_scaling_min_13;
				float depth = computeDepth(st);
			   
				// Height exaggeration relative to terrain:
				p.xyz += u_model_normal_8 * (terrain_height + depth * u_vertical_exaggeration_11);
 
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
 
			${computeDepth}

			czm_material sdg_czm_getMaterial(czm_materialInput materialInput) {
				czm_material material = czm_getDefaultMaterial(materialInput);
				material.diffuse = czm_gammaCorrect(v_color * vec3(1.0));
				material.alpha = u_alpha_12;
				material.specular = 0.0;
				material.shininess = 0.0;
				return material;
			}
		   
			void main() {

				float terrain_height = texture(u_terrain_1, v_st).r * (u_terrain_scaling_max_14 - u_terrain_scaling_min_13) + u_terrain_scaling_min_13;
				float depth = computeDepth(v_st);
				if (depth == flood_plane_class_mapping[0] || depth == flood_plane_class_mapping[1] || terrain_height == u_terrain_scaling_min_13) {
					discard;
				}
				float alphaMultiplier = 1.0;
				if (depth < 0.1) {
					alphaMultiplier = 0.2;
				} else if (depth < 0.2) {
					alphaMultiplier = 0.4;
				} else if (depth < 0.3) {
					alphaMultiplier = 0.6;
				} else if (depth < 0.4) {
					alphaMultiplier = 0.8;
				}

				// normalize the depth value using the minimum and maximum depth
				float min = flood_plane_class_mapping[0];
				float max = flood_plane_class_mapping[${floodPlaneClassMapping.length - 1}];
				float depth_normalized = (depth - min) / (max - min);
				// use the normalized depth value to interpolate between two colors
				v_color = mix(vec3(0.522, 0.631, 0.737), vec3(0.0, 0.0, 0.400), depth_normalized * 1.0);
 
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
				material.alpha *= alphaMultiplier;
			   
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
					u_progress: 0,
					u_terrain: this.uniformMap.uTerrain.value,
					u_flood_slot_1: this.uniformMap.uFloodSlot1.value,
					u_flood_slot_2: this.uniformMap.uFloodSlot2.value,
					u_flood_slot_3: this.uniformMap.uFloodSlot3.value,
					u_flood_slot_4: this.uniformMap.uFloodSlot4.value,
					u_flood_t1: 0,
					u_flood_t2: 1,
					u_model_normal: modelNormal,
					u_texel_size_s: 1 / lonSteps,
					u_texel_size_t: 1 / latSteps,
					u_vertical_exaggeration: get(this.verticalExaggeration),
					u_alpha: get(this.alpha),
					u_terrain_scaling_min: terrainScalingMin,
					u_terrain_scaling_max: terrainScalingMax,
					u_depth_value_max: 255.0
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
			flat: true,
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
		//@ts-ignore
		this.primitive.type = "flood";
	}

}


export class FloodLayer extends CesiumLayer<DynamicWaterLevel> {

	private layerControl!: CustomLayerControl;
	public _time: Writable<number> = writable(0);

	private timeUnsubscriber!: Unsubscriber;
	public loaded: Writable<boolean> = writable(false);
	public error: Writable<boolean> = writable(false);

	constructor(map: Map, config: LayerConfig) {
		super(map, config);

		this.source = new DynamicWaterLevel({
			map: this.map,
			gridSpacingInMeters: this.config.settings.resolution,
			url: this.config.settings.url,
			alpha: get(this.opacity) / 100
		});

		this.addControl()
		this.setTimeListener()
	}

	private setTimeListener(): void {
		this.timeUnsubscriber?.();
		this.timeUnsubscriber = this._time.subscribe((value: number) => {
			this.source?.time.set(value);
		});
	}
	
	/**
	 * Use an external time store for the layer
	 */
	set time(timeStore: Writable<number>) {
		this._time = timeStore;
		this.setTimeListener();
	}


	public async loadScenario(breach: Breach, scenario: string): Promise<void> {
		this.loaded.set(false);
		this.error.set(false);
		try {
			this.clear();
			const endpoint = `${breach.properties.dijkring}_${breach.properties.name}_${scenario}`;
			await this.source.load(endpoint);
			if (!this.config.cameraPosition && this.source.contents) {
				const { ne, sw } = this.source.contents;
				const rectangle = Cesium.Rectangle.fromDegrees(sw[0], sw[1], ne[0], ne[1]);
				const sphere = Cesium.BoundingSphere.fromRectangle3D(rectangle);
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(sphere);
			}
			this.loaded.set(true);
			this.addToMap();
		} catch(e) {
			this.error.set(true);
		} 
		this.map.refresh();
	}

	public clear(): void {
		if (this.source.primitive) {
			this.map.viewer.scene.primitives.remove(this.source.primitive); // Primitive is automatically destroyed
			this.source.primitive = undefined;
		}
	}

	public async addToMap(): Promise<void> {
		if (this.source.primitive && !this.map.viewer.scene.primitives.contains(this.source.primitive)) {
			this.map.viewer.scene.primitives.add(this.source.primitive);
		}
		if (get(this.visible) === true) {
			this.show();
		} else {
			this.hide();
		}
		this.map.refresh();
	}

	public removeFromMap(): void {
		this.removeControl();
		this.timeUnsubscriber();
		this.source?.removeListeners();
		if (this.source.primitive) {
			this.map.viewer.scene.primitives.remove(this.source.primitive);
		}
	}

	public show(): void {
		if (!this.loaded) return;
		if (this.source.primitive) this.source.primitive.show = true;
		this.map.refresh();
	}

	public hide(): void {
		if (!this.loaded) return;
		if (this.source.primitive) this.source.primitive.show = false;
		this.map.refresh();
	}

	private addControl(): void {
		this.layerControl = new CustomLayerControl();
		this.layerControl.component = LayerControlFlood;
		this.layerControl.props = {
			layer: this,
			map: this.map,
		};
		// I disabled this for now, is it necessary?
		//this.addCustomControl(this.layerControl);
	}

	private removeControl(): void {
		this.removeCustomControl(this.layerControl);
	}

	public opacityChanged(opacity: number): void {
		if (this.source) {
			this.source.alpha.set(opacity > 100 ? 1.0 : opacity < 0 ? 0 : opacity / 100);
		}
	}
}

