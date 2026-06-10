import { writable, type Writable, get } from "svelte/store";
import * as Cesium from "cesium";
import { CesiumLayer } from "./cesium-layer";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import type { Map as CesiumMap } from "../map";
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
	public hiddenValues: Writable<Map<string, Set<number>>>;
	private depthScale: VoxelDepthScale | null = null;

	constructor(map: CesiumMap, config: LayerConfig) {
		super(map, config);

		const settings = this.settings;
		const initial = settings.defaultProperty ?? settings.properties[0]?.name;

		if (!initial) {
			throw new Error(`VoxelLayer "${config.title}": no properties configured`);
		}

		this.selectedProperty = writable(initial);
		this.alpha = writable(opacityToAlpha(get(this.opacity)));
		this.resolvedProperties = writable<Array<ResolvedVoxelProperty>>([]);
		this.hiddenValues = writable(new Map());
		this.createLayer();
		this.selectedProperty.subscribe(() => this.applyShader());
	}

	public toggleHidden(propName: string, value: number): void {
		this.hiddenValues.update((m) => {
			const next = new Map(m);
			const updated = new Set(next.get(propName) ?? []);

			if (updated.has(value)) {
				updated.delete(value);
			} else {
				updated.add(value);
			}

			next.set(propName, updated);
			return next;
		});

		// Only the visible property's mask needs updating
		if (propName === get(this.selectedProperty)) {
			const mask = hiddenMask(get(this.hiddenValues).get(propName));
			this.source?.customShader?.setUniform("u_hiddenMask", mask);
			this.map.refresh();
		}
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
		// u_hiddenMask is a bitmask: bit N set => category value N is hidden. Toggling a
		// legend entry just flips a bit and calls setUniform — no GLSL recompile.
		return new Cesium.CustomShader({
			uniforms: {
				u_alpha: {
					type: Cesium.UniformType.FLOAT,
					value: get(this.alpha)
				},
				u_hiddenMask: {
					type: Cesium.UniformType.INT,
					value: hiddenMask(get(this.hiddenValues).get(property.name))
				}
			},
			fragmentShaderText: `
				void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
					int v = int(float(fsInput.metadata.${property.name}) * 255.0 + 0.5);
					material.alpha = u_alpha;
					${noDataGuard}
					// (1 << v) is the mask with only bit v on;
					// & tests whether that bit is set ie category v is hidden.
					if ((u_hiddenMask & (1 << v)) != 0) { material.alpha = 0.0; return; }
					${branches}
					material.diffuse = vec3(0.5, 0.5, 0.5);
				}
			`
		});
	}
}

/** Packs a set of hidden category values into a 32-bit bitmask for the shader.
Each category value owns one bit; bit N set => category N is hidden.

hide categories {2, 5}:

```
  bit:  31 ...  5  4  3  2  1  0
      +----+   +--+--+--+--+--+--+
mask  |  0 |...| 1| 0| 0| 1| 0| 0|   = 36
      +----+   +--+--+--+--+--+--+
                 ↑        ↑
              hidden    hidden
```

set a bit (JS):    mask |= 1 << value
test a bit (GLSL): (u_hiddenMask & (1 << v)) != 0

We use a shader uniform instead of recompiling the shader string for perf reasons.
Baking hidden values into the shader source would force a full recompile on every click, which lags.
The bitpacked mask is one INT the GPU reads every frame, so a legend toggle is just a setUniform() call.

toggle -> flip bit in Set -> hiddenMask() -> setUniform("u_hiddenMask")

Values >= 31 can't be represented, fine for our GeoTOP Zeeland dataset
*/
function hiddenMask(values: Set<number> | undefined): number {
	let mask = 0;

	if (values) {
		for (const value of values) {
			if (value >= 0 && value < 31) {
				// (1 << value) is the mask with only bit `value` on;
				// |= turns that bit on in mask.
				mask |= 1 << value;
			}
		}
	}

	return mask;
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
