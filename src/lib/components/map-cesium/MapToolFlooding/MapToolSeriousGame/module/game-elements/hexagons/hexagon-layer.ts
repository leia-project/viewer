import * as Cesium from "cesium";
import { writable, type Writable } from "svelte/store";
import { Hexagon } from "./hexagon";
import { PGRestAPI, type HexagonEntry } from "../api/pg-rest-api";
import type { Map } from "$lib/components/map-cesium/module/map";


export class HexagonLayer {

	private map: Map;
	private primitive?: Cesium.Primitive;
	private outline: {type: string, coordinates: Array<Array<[lon: number, lat: number]>>}
	public hexagons: Array<Hexagon> = [];
	public selectedHexagon: Writable<Array<Hexagon>> = writable([]);
	private pgRestAPI = new PGRestAPI();

	private material: Cesium.Material = new Cesium.Material({
		fabric: {
			type: 'HexagonMaterial',
			uniforms: {
				custom_alpha: 1,
				progress: 1,
				exag: 1
			} 
		},
		translucent: false
	});

	constructor(map: Map, scenario: string, outline: {type: string, coordinates: Array<Array<[lon: number, lat: number]>>}) {
		this.map = map;
		this.outline = outline;
		this.loadHexagons(scenario);
		this.selectedHexagon.subscribe((hexagons: Array<Hexagon>) => {

		});
	}

	private async loadHexagons(scenario: string): Promise<void> {
		// load hexagons from server
		const hexagons = await this.pgRestAPI.getHexagons(this.outline, 7);

		// Add to map
		hexagons.forEach((hex: HexagonEntry) => {
			const newHex = new Hexagon(hex.hex, hex.population);
			this.hexagons.push(newHex);
		});

		this.createPrimitive();
	}

	private createPrimitive(): void {
		this.primitive?.destroy();
		const geometryInstances = this.hexagons.map((hex: Hexagon) => hex.geometryInstance);
		const appearance = new Cesium.MaterialAppearance({
			material: this.material,
			flat: true,
			translucent: false,
			vertexShaderSource: vertexShader,
			fragmentShaderSource: fragmentShader,
			renderState: {
				blending: Cesium.BlendingState.ALPHA_BLEND
			}
		});
		const primitive = new Cesium.Primitive({
			geometryInstances: geometryInstances,
			appearance: appearance,
			releaseGeometryInstances: false,
			allowPicking: false,
			asynchronous: false,
			show: true
		});

		this.map.viewer.scene.primitives.add(primitive);

		this.primitive = primitive;
	}

	private setTotals(): { evacuated: number } {
		return this.hexagons.reduce((acc: { evacuated: number }, hex: Hexagon) => {
			acc.evacuated += hex.evacuated;
			return acc;
		}, { evacuated: 0 });
	}

	public onLeftClick(picked: any): void {
		// highlight hexagon, and show info
	}
}




/**
 * Vertex shader for the H3 layer
 * The score is used to determine the height of the hexagon
 * Vertices on the bottom of the hexagon have a vectorUp of vec3(0, 0, 0)
 */
const vertexShader = `
	in vec3 position3DHigh;
	in vec3 position3DLow;
	in vec3 normal;
	in vec4 color;
	in float batchId;
	in float topBottom;
	in vec3 vectorUp;

	out vec3 v_positionEC;
	out vec3 v_normalEC;
	out vec4 v_color;

	uniform float custom_alpha_0;
	uniform float progress_1;
	uniform float exag_2;

	void main() {
		vec4 p = czm_computePosition();

		if (vectorUp.z != 0.0) {
			float population = czm_batchTable_population(batchId);
			float prev = czm_batchTable_previousPopulation(batchId);
			p -= vec4(vectorUp * (population + ((prev - population) * (1. - progress_1))) * exag_2, 0.0); // vec4(vectorUp * previous * 1500. , 0.0); // (color.a + ((previous - color.a) * (1. - progress_1)))
			v_color = color;
		} else {
			v_color = vec4(color.rgb * 0.5, 1.0);
		}
		v_color.a = custom_alpha_0;
			
		v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
		v_normalEC = czm_normal * normal;                         // normal in eye coordinates

		gl_Position = czm_modelViewProjectionRelativeToEye * p;
	}
`;

const fragmentShader = `
	in vec3 v_positionEC;
	in vec3 v_normalEC;
	in vec4 v_color;

	void main()
	{
		vec3 positionToEyeEC = -v_positionEC;

		vec3 normalEC = normalize(v_normalEC);
	#ifdef FACE_FORWARD
		normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
	#endif

		vec4 color = czm_gammaCorrect(v_color);

		czm_materialInput materialInput;
		materialInput.normalEC = normalEC;
		materialInput.positionToEyeEC = positionToEyeEC;
		czm_material material = czm_getDefaultMaterial(materialInput);
		material.diffuse = color.rgb;
		material.alpha = color.a;
	#ifdef FLAT
		out_FragColor = czm_gammaCorrect(v_color);
	#else
		out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
	#endif
	}
`;
