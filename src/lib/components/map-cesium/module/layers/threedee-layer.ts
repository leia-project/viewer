import { type Writable, writable, get } from "svelte/store";
import * as Cesium from "cesium";
import { Cesium3DTileset, ShadowMode } from "cesium";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import type { LayerConfig } from "$lib/components/map-core/layer-config";

import LayerControlHeight from "../../LayerControlHeight/LayerControlHeight.svelte";
import LayerControlTheme from "../../LayerControlTheme/LayerControlTheme.svelte";
import LayerControlClip from "../../LayerControlClip/LayerControlClip.svelte";
import { ClipSlider } from "../../LayerControlClip/clip-slider";
import { PrimitiveLayer } from "./primitive-layer";
import type { Map } from "../map";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";


export class ThreedeeLayer extends PrimitiveLayer {
	public tilesetHeight: Writable<number>;
	private heightControl: CustomLayerControl | undefined;
	private themeControl: CustomLayerControl | undefined;
	public clipControl: CustomLayerControl | undefined;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.tilesetHeight = writable<number>(0);
		this.createLayer();
		this.addListeners();
	}

	private addListeners(): void {
		this.tilesetHeight.subscribe(h => {
			this.setHeight(h);
		})
	}

	private async createLayer(): Promise<void> {

		this.map.options.proMode.subscribe(enabled => {
			if (enabled) {
				this.heightControl = new CustomLayerControl();
				this.heightControl.component = LayerControlHeight;
				this.heightControl.props = { tilesetHeight: this.tilesetHeight };
				this.addCustomControl(this.heightControl);
			} else if (!enabled && this.heightControl) {
				this.removeCustomControl(this.heightControl);
			}
		});

		if (this.config.settings["themes"]) {
			const themes = this.config.settings["themes"];

			const themeSelectedCondition = this.getThemeConditionSelected();
			for (let i = 0; i < themes.length; i++) {
				themes[i].conditions.unshift(themeSelectedCondition);
			}

			this.themeControl = new CustomLayerControl();
			this.themeControl.component = LayerControlTheme;
			this.themeControl.props = { layer: this, themes: themes, defaultTheme: this.config.settings["defaultTheme"] };
			this.addCustomControl(this.themeControl);
		}

		/* 
				const customShader = new Cesium.CustomShader({
					lightingModel: Cesium.LightingModel.PBR,
					mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
					uniforms: {
						u_colorIndex: {
							type: Cesium.UniformType.FLOAT,
							value: 0.5
						},
						u_colorStart: {
							type: Cesium.UniformType.VEC3,
							value: { x: 0.0, y: 0.0, z: 0.0 }
						},
						u_colorEnd: {
							type: Cesium.UniformType.VEC3,
							value: { x: 1.0, y: 0.0, z: 0.0 }
						}
					},
					varyings: {
						v_selectedColor: Cesium.VaryingType.VEC3
					},
					vertexShaderText: `
		  void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
			vec4 positionENU = u_inverse * vsInput.attributes.positionWC;
			// modify positionENU as output here, for example, scale z by 0.1
			vec4 modifiedPosition = positionENU * vec4(1.0, 1.0, 0.1, 1.0);
			vsOutput.positionMC = u_toEcefMatrix * modifiedPosition;
		  }`,
					fragmentShaderText: `
						void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
		
							float take = 0.0;
							if(fsInput.attributes.positionMC.z > 10.0) {
								take = 1.0;
							}
						    
							vec3 testColor = mix(u_colorStart, u_colorEnd, take);
							material.diffuse = vec3(testColor.r, testColor.g, testColor.b);
						    
						}
					`
				});  */

		/* const newShader = new Cesium.CustomShader({
			lightingModel: Cesium.LightingModel.PBR,
		fragmentShaderText : `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
		{
			material.diffuse = vec3(0.0, 0.0, 1.0);
  
			vec3 position_absolute = vec3(czm_model * vec4(fsInput.attributes.positionMC, 1.0));
			
			float height = (position_absolute.z - 0.0) / (4.0 - 0.0) * (0.9 - 0.0) + 0.0;
			material.diffuse = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), height);
		}`
		  });
 */
		//#material.diffuse.g = -fsInput.attributes.positionEC.z / 0.1e4;

		const tileset = await Cesium3DTileset.fromUrl(this.config.settings["url"], {
			shadows:
				this.config.settings["shadows"] === false
					? ShadowMode.DISABLED
					: ShadowMode.ENABLED,
			backFaceCulling: true,
			showOutline: false,
			cullRequestsWhileMovingMultiplier: 600,
			maximumScreenSpaceError: 16
		});


		if (this.config.settings["style"]) {
			tileset.style = new Cesium.Cesium3DTileStyle(this.config.settings.style);
		}
		
		//tileset.customShader = newShader;
		//tileset.outlineColor = Cesium.Color.AQUA;
		//tileset.showOutline = true;

		/* 	tileset.tileVisible.addEventListener(function (tile) {
			var content = tile.content;

			if (content.styleSet === true) {
				return;
			}

			content.styleSet = true;
			var featuresLength = content.featuresLength;
			for (var i = 0; i < featuresLength; i += 2) {
				const feature = content.getFeature(i);
				//feature.color = undefined;
				//feature.color_0 = Cesium.Color.fromRandom();
				//feature.color_1 = Cesium.Color.fromRandom();
			}
		}); */

		this.source = tileset;

		if(!this.source) {
			return;
		}

		if (this.config.settings["enableClipping"]) {
			this.clipControl = new CustomLayerControl();
			this.clipControl.component = LayerControlClip;
			this.clipControl.props = {
				clipSlider: new ClipSlider(this, this.map)
			};
			this.addCustomControl(this.clipControl);
		}


		this.setPointCloudAttenuation(get(this.map.options.pointCloudAttenuation));
		this.setPointCloudAttenuationMaximum(get(this.map.options.pointCloudAttenuationMaximum));
		this.setPointCloudAttenuationGeometricErrorScale(get(this.map.options.pointCloudAttenuationErrorScale));
		this.setPointCloudAttenuationBaseResolution(get(this.map.options.pointCloudAttenuationBaseResolution));

		this.setPointCloudEdl(get(this.map.options.pointCloudEDL));
		this.setPointCloudEdlStrength(get(this.map.options.pointCloudEDLStrength));
		this.setPointCloudEdlRadius(get(this.map.options.pointCloudEDLRadius));

		if (!tileset) {
			return;
		}

		if (!this.config.cameraPosition) {
			this.config.cameraPosition = getCameraPositionFromBoundingSphere(tileset.boundingSphere);
		}

		if (this.config.settings.tilesetHeight) {
			this.tilesetHeight.set(this.config.settings.tilesetHeight);
		}

		if (this.config.settings.defaultTheme) {
			this.applyThemeByName(this.config.settings.defaultTheme);
		} else {
			//@ts-ignore
			if (tileset.root?._header?.content?.uri?.includes(".pnts")) {
				// ToDo: How to check if tileset is pnts? do nothing
			} else {
				this.setTheme(this.getEmptyTheme());
			}
		}

		//this.addShader(tileset);
	}

	public getEmptyTheme(): Cesium.Cesium3DTileStyle {
		return new Cesium.Cesium3DTileStyle({
			color: {
				conditions: [this.getThemeConditionSelected()]
			}
		});
	}

	public getThemeConditionSelected(): Array<string> {
		const selectedColor = get(this.map.featureInfo.selectedFeatureColor);
		const selectedPropperty = this.map.featureInfoHandler.selectedProperty;
		return [`\${${selectedPropperty}} === 'true'`, `color("${selectedColor}")`];
	}

	public applyThemeByName(themeName: string): void {
		const theme = this.getThemeById(themeName);
		if (!theme) {
			this.setTheme(this.getEmptyTheme());
		}

		const style = new Cesium.Cesium3DTileStyle({
			color: {
				conditions: theme.conditions
			}
		});
		this.setTheme(style);
	}

	public setTheme(style: Cesium.Cesium3DTileStyle): void {
		this.source.style = style;
	}

	public getThemeById(themeId: string): any {
		if (this.config.settings["themes"]) {
			const themes = this.config.settings["themes"];
			for (let i = 0; i < themes.length; i++) {
				if (themes[i].title === themeId) {
					return themes[i];
				}
			}
		}

		return undefined;
	}

	private setHeight(height: number) {
		if (!height || !this.source) {
			return;
		}

		const cartographic = Cesium.Cartographic.fromCartesian(
			this.source.boundingSphere.center
		);

		const offset = Cesium.Cartesian3.fromRadians(
			cartographic.longitude,
			cartographic.latitude,
			height
		);

		const surface = Cesium.Cartesian3.fromRadians(
			cartographic.longitude,
			cartographic.latitude,
			0.0
		);

		const translation = Cesium.Cartesian3.subtract(
			offset,
			surface,
			new Cesium.Cartesian3()
		);

		this.source.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
		this.map.refresh();
	}

	public setPointCloudAttenuation(value: boolean): void {
		if(!this.source) return;
		this.source.pointCloudShading.attenuation = value;
	}

	public setPointCloudAttenuationMaximum(value: number): void {
		if(!this.source) return;
		// @ts-ignore
		this.source.pointCloudShading.maximumAttenuation = this.checkZero(value);
	}

	public setPointCloudAttenuationGeometricErrorScale(value: number): void {
		if(!this.source) return;
		this.source.pointCloudShading.geometricErrorScale = value;
	}

	public setPointCloudAttenuationBaseResolution(value: number): void {
		if(!this.source) return;
		// @ts-ignore
		this.source.pointCloudShading.baseResolution = this.checkZero(value);
	}

	public setPointCloudEdl(value: boolean): void {
		if(!this.source) return;
		this.source.pointCloudShading.eyeDomeLighting = value;
	}

	public setPointCloudEdlStrength(value: number): void {
		if(!this.source) return;
		this.source.pointCloudShading.eyeDomeLightingStrength = value;
	}

	public setPointCloudEdlRadius(value: number): void {
		if(!this.source) return;
		this.source.pointCloudShading.eyeDomeLightingRadius = value;
	}

	private checkZero(value: number) {
		return parseFloat(value.toString()) <= 0.0 ? undefined : value;
	}

	async addShader(tileset: Cesium3DTileset): Promise<void> {
        const customShader = new Cesium.CustomShader({
			mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
			lightingModel: Cesium.LightingModel.PBR,
			uniforms: {
				model_vector: {
					type: Cesium.UniformType.VEC3,
					value: tileset.root.boundingSphere.center
				}
			},
			varyings: {
				v_selectedColor: Cesium.VaryingType.VEC3,
				v_normal: Cesium.VaryingType.VEC3,
			},
			vertexShaderText: `
			vec3 vectorProjection(vec3 A, vec3 B) {
				float dotProduct = dot(A, B);
				float lengthSquared = dot(B, B);
				vec3 projection = (dotProduct / lengthSquared) * B;
				return projection;
			}
			
			void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
				vec3 height = vectorProjection(vsInput.attributes.positionMC, model_vector);

				if(height.y > -6.2) {
					v_selectedColor = vec3(1, 0.6784, 0.2);	
				} else {
					v_selectedColor = vec3(0.70196, 0.41961, 0.0);
				}
			}
			`,
			fragmentShaderText: `
			void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
				//vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            	//float diff = max(dot(v_normal, lightDir), 0.0);
            	//vec3 diffuse = diff * v_selectedColor;

            	material.diffuse = v_selectedColor;
            	material.alpha = 1.0;
			}
			`
		});

        tileset.customShader = customShader;
    }
}
