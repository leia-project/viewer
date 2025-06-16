import * as Cesium from "cesium";
import { get, writable, type Writable } from "svelte/store";
import { Hexagon } from "./hexagon";
import { PGRestAPI, type HexagonEntry } from "../api/pg-rest-api";
import type { Map } from "$lib/components/map-cesium/module/map";
import HexagonInfoBox from "../../../components/infobox/HexagonInfoBox.svelte";
import type { EvacuationController } from "../evacuation-controller";


export class HexagonLayer {

	private map: Map;
	private primitive?: Cesium.Primitive;
	private outline: Array<[lon: number, lat: number]>;
	public hexagons: Array<Hexagon> = [];
	private pgRestAPI = new PGRestAPI();
	public visible: Writable<boolean> = writable<boolean>(true);
	public use2DMode: Writable<boolean> = writable<boolean>(false);
	private hexagonEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource();
	public title: string = "CBS Hexagons";

	private material: Cesium.Material = new Cesium.Material({
		fabric: {
			type: 'HexagonMaterial',
			uniforms: {
				custom_alpha: 1,
				exag: 0.01
			} 
		},
		translucent: false
	});

	private hoveredHexagon: Writable<Hexagon | undefined> = writable();
	private hexagonHoverBox: HexagonInfoBox | undefined;
	public hoverBoxTimeOut: NodeJS.Timeout | undefined;

	public selectedHexagon: Writable<Hexagon | undefined> = writable();
	private hexagonInfoBox: HexagonInfoBox | undefined;
	public infoBoxTimeOut: NodeJS.Timeout | undefined;

	constructor(map: Map, elapsedTime: Writable<number>, scenario: string, outline: Array<[lon: number, lat: number]>, evacuationController: EvacuationController) {
		this.map = map;
		this.outline = outline;
		this.loadHexagons(scenario);
		this.selectedHexagon.subscribe((hexagon: Hexagon | undefined) => {
			// highlight the accompanied evacuation
			if (hexagon instanceof Hexagon) {
				this.hexagonInfoBox?.$destroy();
				this.hexagonInfoBox = new HexagonInfoBox({
					target: map.getContainer(),
					props: {
						hexagon,
						store: this.selectedHexagon,
						map: this.map,
						type: "selected",
						evacuationController
					}
				});
			} else {
				this.infoBoxTimeOut = setTimeout(() => this.hexagonInfoBox?.$destroy(), 400);
			}
		});
		this.hoveredHexagon.subscribe((hexagon: Hexagon | undefined) => {
			if (hexagon instanceof Hexagon && hexagon !== get(this.selectedHexagon)) {
				this.hexagonHoverBox?.$destroy();
				this.hexagonHoverBox = new HexagonInfoBox({
					target: map.getContainer(),
					props: {
						hexagon,
						store: this.hoveredHexagon,
						map: this.map,
						type: "hover",
						evacuationController
					}
				});
			} else {
				this.hoverBoxTimeOut = setTimeout(() => this.hexagonHoverBox?.$destroy(), 400);
			}
		});
		elapsedTime.subscribe((time: number) => {
			this.hexagons.forEach((hex: Hexagon) => hex.timeUpdated(time));
		});
		this.visible.subscribe((b) => {this.toggleHexagons(b)});
		this.use2DMode.subscribe((b) => {this.toggle2D3DModeHexagons(b)});
	}

	private async loadHexagons(scenario: string): Promise<void> {
		const hexagons = await this.pgRestAPI.getHexagons(this.outline, 7, [scenario]);

		hexagons.forEach((hex: HexagonEntry) => {
			const newHex = new Hexagon(hex.hex, hex.population, undefined, this.selectedHexagon); // hex.flooded_after);
			this.hexagons.push(newHex);
		});

		this.createPrimitive();
		this.addHexagonEntities();
	}

	private createPrimitive(): void {
		this.primitive?.destroy();
		const geometryInstances = this.hexagons.map((hex: Hexagon) => hex.geometryInstances).flat();
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
			allowPicking: true,
			asynchronous: false
		});

		this.map.viewer.scene.primitives.add(primitive);
		this.hexagons.forEach((hex: Hexagon) => hex.parentPrimitive = primitive);
		this.primitive = primitive;
	}

	private addHexagonEntities(): void {
		for (let i = 0; i < this.hexagons.length; i++) {
			this.hexagonEntities.entities.add(this.hexagons[i].entityInstance);
		}
		this.map.viewer.dataSources.add(this.hexagonEntities);
	}
	
	public highlight(hexagon: Hexagon, event: "click" | "hover"): void {
		if (event === "hover" && hexagon === get(this.selectedHexagon)) return;
		const color = event === "hover" ? Cesium.Color.LIGHTPINK : Cesium.Color.HOTPINK;
		const attributes = this.primitive?.getGeometryInstanceAttributes(hexagon.hex);
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(color, attributes.color);
	}

	public unhighlight(hexagon: Hexagon, event: "click" | "hover"): void {
		if (event === "hover" && hexagon === get(this.selectedHexagon)) return;
		const attributes = this.primitive?.getGeometryInstanceAttributes(hexagon.hex);
		attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(hexagon.valueToColor(hexagon.population), attributes.color);
	}
	
	public onLeftClick(picked: any): void {
		let pickedHexagon: Hexagon | undefined;
		const selectedHexagon = get(this.selectedHexagon);
		if (picked?.primitive instanceof Cesium.Primitive && picked?.id) {
			pickedHexagon = this.hexagons.find((hex: Hexagon) => hex.hex === picked.id);
		}
		if (!pickedHexagon && picked?.id !== undefined) {
			return; // Something else was clicked, not a hexagon, so do nothing
		}
		if (selectedHexagon && selectedHexagon !== pickedHexagon) {
			this.unhighlight(selectedHexagon, "click");
		}
		this.selectedHexagon.set(pickedHexagon);
		if (pickedHexagon) this.highlight(pickedHexagon, "click");
		this.map.refresh();
	}

	public onMouseMove(picked: any): void {
		if (typeof picked?.id === "string" && picked.id.endsWith("-top")) {
			picked.id = picked.id.slice(0, -4); // Remove "-top" suffix to get the hexagon id when clicking top hexagons
		}
		let hoveredHexagon = get(this.hoveredHexagon);
		if (picked?.primitive instanceof Cesium.Primitive && picked?.id) {
			if (hoveredHexagon && hoveredHexagon.hex !== picked.id) {
				this.unhighlight(hoveredHexagon, "hover");
			}
			hoveredHexagon = this.hexagons.find((hex: Hexagon) => hex.hex === picked.id);
			this.hoveredHexagon.set(hoveredHexagon);
			if (hoveredHexagon) this.highlight(hoveredHexagon, "hover");
			this.map.viewer.scene.canvas.style.cursor = "pointer";
		} else if (picked?.id === undefined) {
			if (hoveredHexagon && hoveredHexagon !== get(this.selectedHexagon)) {
				this.unhighlight(hoveredHexagon, "hover");
				this.hoveredHexagon.set(undefined);
			}
		}
		this.map.refresh();
	}
	
	public toggle2D3DModeHexagons(show: boolean): void {
		if(!get(this.visible)) {
			return;
		}
		this.hexagonEntities.show = show;
		if(this.primitive) {
			this.primitive.show = !show;
		}
		this.map.refresh();
	}

	public toggleHexagons(show: boolean): void {
		if (show) {
			this.hexagonEntities.show = get(this.use2DMode);
			if(this.primitive) {
				this.primitive.show = !get(this.use2DMode);
			}
		} else {
			this.hexagonEntities.show = false;
			if(this.primitive) {
				this.primitive.show = false;
			}
		}
		this.map.refresh();
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
	in vec3 vectorUp;
  
	out vec3 v_positionEC;
	out vec3 v_normalEC;
	out vec4 v_color;

	uniform float custom_alpha_0;
	uniform float exag_1;

	void main() {
		vec4 p = czm_computePosition();

		float offsetBottom = czm_batchTable_offsetBottom(batchId);
		float offsetTop = czm_batchTable_offsetTop(batchId);

		// To distinguish between the top and bottom of the hexagon, we set the vectorUp positive for top and negative for bottom in polygon-geometry.ts...
		if (vectorUp.z < 0.0) {
			p -= vec4(vectorUp * (offsetTop - 1.0) * exag_1, 0.0);
			v_color = color;
		} else {
		    p += vec4(vectorUp * offsetBottom * exag_1, 0.0);
			v_color = vec4(color.rgb * 0.5, 1.0);
		}
		v_color.a *= custom_alpha_0;
			
		v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
		v_normalEC = czm_normal * normal;                         // normal in eye coordinates

		gl_Position = czm_modelViewProjectionRelativeToEye * p;
	}
`;

const fragmentShader = `
	in vec3 v_positionEC;
	in vec3 v_normalEC;
	in vec4 v_color;

	void main() {
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
