import * as Cesium from "cesium";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import type { Map } from "$lib/components/map-cesium/module/map";
import { Hexagon } from "./hexagon";
import { PGRestAPI, type CBSHexagon, type FloodHexagon } from "../api/pg-rest-api";
import HexagonInfoBox from "../../../components/infobox/HexagonInfoBox.svelte";
import type { EvacuationController } from "../evacuation-controller";


export class HexagonLayer {

	private map: Map;
	private primitive?: Cesium.Primitive;
	private outline: Array<[lon: number, lat: number]>;
	public hexagons: Array<Hexagon> = [];
	public loaded: Writable<boolean> = writable(false);

	private pgRestAPI = new PGRestAPI();
	public visible: Writable<boolean> = writable<boolean>(true);
	public use2DMode: Writable<boolean> = writable<boolean>(false);
	private hexagonEntities: Cesium.CustomDataSource = new Cesium.CustomDataSource();
	public title: string = "CBS Hexagons";
	public alpha: Writable<number> = writable(1);

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
	private hexagonSelectBox: HexagonInfoBox | undefined;
	private selectBoxTimeOut: NodeJS.Timeout | undefined;

	public evacuatedCount!: Readable<number>;
	public victimCount!: Readable<number>;

	constructor(evacuationController: EvacuationController, scenarios: Array<string>, outline: Array<[lon: number, lat: number]>) {
		this.map = evacuationController.map;
		this.outline = outline;
		this.loadHexagons();
		this.selectedHexagon.subscribe((hexagon: Hexagon | undefined) => {
			// highlight the accompanied evacuation
			if (hexagon instanceof Hexagon) {
				this.hexagonHoverBox?.$destroy();
				this.hexagonSelectBox?.$destroy();
				this.hexagonSelectBox = new HexagonInfoBox({
					target: this.map.getContainer(),
					props: {
						hexagon,
						store: this.selectedHexagon,
						timeout: this.selectBoxTimeOut,
						map: this.map,
						type: "selected",
						evacuationController
					}
				});
			} else {
				this.selectBoxTimeOut = setTimeout(() => this.hexagonSelectBox?.$destroy(), 400);
			}
		});
		this.hoveredHexagon.subscribe((hexagon: Hexagon | undefined) => {
			if (hexagon instanceof Hexagon && hexagon !== get(this.selectedHexagon)) {
				this.hexagonHoverBox?.$destroy();
				this.hexagonHoverBox = new HexagonInfoBox({
					target: this.map.getContainer(),
					props: {
						hexagon,
						store: this.hoveredHexagon,
						timeout: this.hoverBoxTimeOut,
						map: this.map,
						type: "hover",
						evacuationController,
						selectStore: this.selectedHexagon
					}
				});
			} else {
				this.hoverBoxTimeOut = setTimeout(() => this.hexagonHoverBox?.$destroy(), 400);
			}
		});
		evacuationController.elapsedTime.subscribe((time: number) => this.updateFloodDepths(scenarios, time));
		this.visible.subscribe((b) => this.toggleHexagons(b));
		this.use2DMode.subscribe((b) => this.toggle2D3DModeHexagons(b));
		this.alpha.subscribe((alpha: number) => {
			this.material.uniforms.custom_alpha = alpha;
			this.map.refresh();
		});
	}

	private async loadHexagons(): Promise<void> {
		const hexagons = await this.pgRestAPI.getCBSHexagons(this.outline, 7);
		hexagons.forEach((hex: CBSHexagon) => {
			const newHex = new Hexagon(hex.hex, hex.population, this.selectedHexagon);
			this.hexagons.push(newHex);
			this.setCounters();
		});
		this.createPrimitive();
		this.addHexagonEntities();
		this.loaded.set(true);
	}

	private setCounters(): void {
		this.evacuatedCount = derived(this.hexagons.map((h) => h.totalEvacuated), (($totalEvacuated, set) => {
			const total = $totalEvacuated.reduce((sum, evacuated) => sum + evacuated, 0);
			set(total);
		}));
		this.victimCount = derived(this.hexagons.map((h) => h.victims), (($victims, set) => {
			const total = $victims.reduce((sum, victims) => sum + victims, 0);
			set(total);
		}));
	}


	private async updateFloodDepths(scenarios: Array<string>, time: number): Promise<void> {
		const h3FloodDepths = await this.pgRestAPI.getFloodHexagons(this.outline, 7, scenarios, time);
		const updatedHexIds = new Set<string>();
		h3FloodDepths.forEach((floodHex: FloodHexagon) => {
			const hex = this.hexagons.find((h: Hexagon) => h.hex === floodHex.hex);
			if (hex) {
				hex.floodDepth.set(floodHex.maxFloodDepth);
				updatedHexIds.add(hex.hex);
			}
		});
		this.hexagons.forEach((hex: Hexagon) => {
			if (!updatedHexIds.has(hex.hex)) hex.floodDepth.set(0);
		});
	}

	private createPrimitive(): void {
		this.primitive?.destroy();
		const geometryInstances = this.hexagons.map((hex: Hexagon) => hex.geometryInstances).flat();
		const appearance = new Cesium.MaterialAppearance({
			material: this.material,
			flat: true,
			translucent: true,
			vertexShaderSource: vertexShader,
			fragmentShaderSource: fragmentShader,
			renderState: {
				blending: Cesium.BlendingState.ALPHA_BLEND,
				depthTest: {
					enabled: true,
					func: Cesium.DepthFunction.LESS
				},
				depthMask: true,
				cull: {
					enabled: true,
					face: Cesium.CullFace.FRONT
				}
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
			selectedHexagon.unhighlight("click");
		}
		this.selectedHexagon.set(pickedHexagon);
		if (pickedHexagon) pickedHexagon.highlight("click");
		this.map.refresh();
	}

	public onMouseMove(picked: any): void {
		/* if ((picked?.primitive instanceof Cesium.Primitive || picked?.id instanceof Cesium.Entity) && picked?.id) {
			if (this.hoveredHexagon && this.hoveredHexagon.hex !== picked.id) {
				this.unhighlight(this.hoveredHexagon, "hover");
			}

			if(picked?.id instanceof Cesium.Entity) {
				this.hoveredHexagon = this.hexagons.find((hex: Hexagon) => hex.entityInstance === picked.id)
			} else if (picked?.primitive instanceof Cesium.Primitive) {
				this.hoveredHexagon = this.hexagons.find((hex: Hexagon) => hex.hex === picked.id);
			} 
			
			if (this.hoveredHexagon) this.highlight(this.hoveredHexagon, "hover"); */
		if (typeof picked?.id === "string" && picked.id.endsWith("-top")) {
			picked.id = picked.id.slice(0, -4); // Remove "-top" suffix to get the hexagon id when clicking top hexagons
		}
		let hoveredHexagon = get(this.hoveredHexagon);
		if (picked?.primitive instanceof Cesium.Primitive && picked?.id) {
			if (hoveredHexagon && hoveredHexagon.hex !== picked.id) {
				hoveredHexagon.unhighlight("hover");
			}
			hoveredHexagon = this.hexagons.find((hex: Hexagon) => hex.hex === picked.id);
			this.hoveredHexagon.set(hoveredHexagon);
			if (hoveredHexagon) hoveredHexagon.highlight("hover");
			this.map.viewer.scene.canvas.style.cursor = "pointer";
		} else if (picked?.id === undefined) {
			if (hoveredHexagon && hoveredHexagon !== get(this.selectedHexagon)) {
				hoveredHexagon.unhighlight("hover");
				this.hoveredHexagon.set(undefined);
			}
		} 
		this.map.refresh();
	}

	public toggle2D3DModeHexagons(show: boolean): void {
		if (!get(this.visible)) {
			return;
		}
		this.hexagonEntities.show = show;
		if (this.primitive) {
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
			p -= vec4(vectorUp * offsetTop * exag_1, 0.0);
			v_color = color;
		} else {
		    p += vec4(vectorUp * (offsetBottom - 1.0) * exag_1, 0.0);
			v_color = vec4(color.rgb * 0.5, 1.0);
		}

		float heightDiff = offsetTop - offsetBottom;
		float fadeAlpha = custom_alpha_0;
		if (heightDiff < 1.0) {
			fadeAlpha *= smoothstep(0.0, 1.0, heightDiff);
		}
		v_color.a *= fadeAlpha;	
		//v_color.a *= custom_alpha_0;
			
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
