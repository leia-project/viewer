import { writable, type Writable, get } from "svelte/store";
import * as Cesium from "cesium";
import { CesiumLayer } from "./cesium-layer";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map } from "../map";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import {
	fetchLegend,
	resolveProperties,
	type ResolvedVoxelProperty,
	type VoxelPropertyConfig
} from "./voxel-legend";
import { VoxelDepthScale } from "../voxel-depth-scale";

import LayerControlVoxel from "../../LayerControlVoxel/LayerControlVoxel.svelte";

export type VoxelLayerSettings = {
	url: string;
	legendDataUrl?: string;
	defaultProperty?: string;
	properties: Array<VoxelPropertyConfig>;
};

export class VoxelLayer extends CesiumLayer<Cesium.VoxelPrimitive> {
	public selectedProperty: Writable<string>;
	public resolvedProperties: Writable<Array<ResolvedVoxelProperty>>;
	public alpha: Writable<number>;
	private depthScale: VoxelDepthScale | null = null;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);

		const settings = this.settings;
		const initial = settings.defaultProperty ?? settings.properties[0]?.name;

		if (!initial) {
			throw new Error(`VoxelLayer "${config.title}": no properties configured`);
		}

		this.selectedProperty = writable(initial);
		this.alpha = writable(opacityToAlpha(get(this.opacity)));
		this.resolvedProperties = writable<Array<ResolvedVoxelProperty>>([]);
		this.createLayer();
		this.selectedProperty.subscribe(() => this.applyShader());
	}

	private get settings(): VoxelLayerSettings {
		return this.config.settings as VoxelLayerSettings;
	}

	public addToMap(): void {
		this.map.viewer.scene.primitives.add(this.source);

		if (get(this.visible)) {
			this.show();
		} else {
			this.hide();
		}
	}

	public removeFromMap(): void {
		const idx = this.getPrimitiveIndex();

		if (idx !== -1) {
			const p = this.map.viewer.scene.primitives.get(idx);
			this.map.viewer.scene.primitives.remove(p);
		} else {
			this.map.viewer.scene.primitives.remove(this.source);
		}

		this.depthScale?.removeFromScene();
		this.depthScale = null;

		this.source?.destroy();
	}

	public show(): void {
		this.setShown(true);
	}

	public hide(): void {
		this.setShown(false);
	}

	private setShown(value: boolean): void {
		if (!this.source) {
			return;
		}
		this.source.show = value;
		this.depthScale?.setVisible(value);
		this.map.refresh();
	}

	public opacityChanged(opacity: number): void {
		if (!this.source) {
			return;
		}

		const alpha = opacityToAlpha(opacity);
		this.alpha.set(alpha);
		this.source.customShader?.setUniform("u_alpha", alpha);
		this.map.refresh();
	}

	private async createLayer(): Promise<void> {
		try {
			const legend = await fetchLegend(this.settings.legendDataUrl);
			this.resolvedProperties.set(resolveProperties(this.settings.properties, legend));

			const provider = await Cesium.Cesium3DTilesVoxelProvider.fromUrl(this.settings.url);
			const primitive = new Cesium.VoxelPrimitive({ provider });

			primitive.nearestSampling = true;
			primitive.depthTest = true;

			this.source = primitive;

			const control = new CustomLayerControl();
			control.component = LayerControlVoxel;
			control.props = { layer: this };
			this.addCustomControl(control);

			this.applyShader();

			if (!this.config.cameraPosition && primitive.boundingSphere) {
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(primitive.boundingSphere);
			}

			const { minBounds, maxBounds } = provider;

			if (minBounds && maxBounds) {
				const east = maxBounds.x; // lon
				const nsMiddle = (minBounds.y + maxBounds.y) / 2; // lat

				this.depthScale = new VoxelDepthScale(this.map, east, nsMiddle, maxBounds.z, minBounds.z);
				this.depthScale.addToScene();
				this.depthScale.setVisible(get(this.visible));
			}

			this.map.refresh();
		} catch (error) {
			console.error(`VoxelLayer "${this.config.title}" failed to load:`, error);
		}
	}

	public applyShader(): void {
		if (!this.source) {
			return;
		}

		const propName = get(this.selectedProperty);
		const property = get(this.resolvedProperties).find((property) => property.name === propName);

		if (!property) {
			return;
		}

		this.source.customShader = this.buildCategoricalShader(property); // only categorical shaders are supported for now
		this.map.refresh();
	}

	private buildCategoricalShader(property: ResolvedVoxelProperty): Cesium.CustomShader {
		const noData = property.noData;
		const noDataGuard =
			noData !== undefined ? `if (v == ${noData}) { material.alpha = 0.0; return; }` : "";

		const branches = property.categories
			.map((category) => {
				const [r, g, b] = category.color;

				return `if (v == ${category.value}) { material.diffuse = vec3(${(r / 255).toFixed(4)}, ${(g / 255).toFixed(4)}, ${(b / 255).toFixed(4)}); return; }`;
			})
			.join("\n\t\t\t\t\t");

		// Cesium normalises UINT8 metadata to [0,1] in the shader; multiply back to recover the integer.
		return new Cesium.CustomShader({
			uniforms: {
				u_alpha: {
					type: Cesium.UniformType.FLOAT,
					value: get(this.alpha)
				}
			},
			fragmentShaderText: `
				void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
					int v = int(float(fsInput.metadata.${property.name}) * 255.0 + 0.5);
					material.alpha = u_alpha;
					${noDataGuard}
					${branches}
					material.diffuse = vec3(0.5, 0.5, 0.5);
				}
			`
		});
	}
}

function opacityToAlpha(opacity: number): number {
	if (opacity > 100) {
		return 1.0;
	}

	if (opacity < 0) {
		return 0.0;
	}

	return opacity / 100;
}
