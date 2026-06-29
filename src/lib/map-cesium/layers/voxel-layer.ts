import { writable, type Writable, get } from "svelte/store";
import * as Cesium from "cesium";
import { CesiumLayer } from "./cesium-layer";
import { CustomLayerControl } from "$lib/map-core/custom-layer-control";
import type { LayerConfig } from "$lib/map-core/layer-config";
import type { Map as CesiumMap } from "../map";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import {
	fetchLegend,
	resolveProperties,
	type ResolvedVoxelProperty,
	type VoxelPropertyConfig
} from "./voxel-legend";
import { DepthScale } from "../depth-scale";
import { VoxelClipSlider } from "./voxel-clip-slider";

import LayerControlVoxel from "$lib/components/layer-controls/LayerControlVoxel/LayerControlVoxel.svelte";
import LayerControlVoxelClip from "$lib/components/layer-controls/LayerControlVoxelClip/LayerControlVoxelClip.svelte";

export type VoxelLayerSettings = {
	url: string;
	legendDataUrl?: string;
	defaultProperty?: string;
	properties: Array<VoxelPropertyConfig>;
};

export type ClipRange = { x: [number, number]; y: [number, number]; z: [number, number] };

const DEFAULT_CLIP_RANGE: ClipRange = { x: [0, 1], y: [0, 1], z: [0, 1] };

export class VoxelLayer extends CesiumLayer<Cesium.VoxelPrimitive> {
	public selectedProperty: Writable<string>;
	public resolvedProperties: Writable<Array<ResolvedVoxelProperty>>;
	public hiddenValues: Writable<Map<string, Set<number>>>;
	public clipping: Writable<ClipRange>;
	public clipSlider: VoxelClipSlider | null = null;
	private bounds: { min: Cesium.Cartesian3; max: Cesium.Cartesian3 } | null = null;
	private depthScale: DepthScale | null = null;

	constructor(map: CesiumMap, config: LayerConfig) {
		super(map, config);

		const settings = this.settings;
		const initial = settings.defaultProperty ?? settings.properties[0]?.name;

		if (!initial) {
			throw new Error(`VoxelLayer "${config.title}": no properties configured`);
		}

		this.selectedProperty = writable(initial);
		this.resolvedProperties = writable<Array<ResolvedVoxelProperty>>([]);
		this.hiddenValues = writable(new Map());
		this.clipping = writable({ ...DEFAULT_CLIP_RANGE });
		this.createLayer();
		this.selectedProperty.subscribe(() => this.rebuildShader());
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
			const mask = packHiddenMask(get(this.hiddenValues).get(propName));
			this.source?.customShader?.setUniform("u_hiddenMask", mask);
			this.map.refresh();
		}
	}

	/** Set the normalised [0,1] clip window for one axis and slice the voxels. */
	public setClip(axis: keyof ClipRange, range: [number, number]): void {
		this.clipping.update((c) => ({ ...c, [axis]: range }));
		this.applyClipping();
	}

	public resetClip(): void {
		this.clipping.set({ ...DEFAULT_CLIP_RANGE });
		this.applyClipping();
	}

	/**
	 * Maps the normalised clip window onto the primitive's clipping bounds.
	 * Bounds are in provider space (x = lon, y = lat, z = height), so x/y slice
	 * horizontally and z slices vertically. At an axis extreme we hand Cesium
	 * ±Infinity so that side stays fully open rather than clamping to the bound.
	 */
	private applyClipping(): void {
		if (!this.source || !this.bounds) {
			return;
		}

		const { min, max } = this.bounds;
		const c = get(this.clipping);

		const clipLo = (t: number, lo: number, hi: number) =>
			t <= 0.001 ? -Infinity : lo + t * (hi - lo);

		const clipHi = (t: number, lo: number, hi: number) =>
			t >= 0.999 ? Infinity : lo + t * (hi - lo);

		this.source.minClippingBounds = new Cesium.Cartesian3(
			clipLo(c.x[0], min.x, max.x),
			clipLo(c.y[0], min.y, max.y),
			clipLo(c.z[0], min.z, max.z)
		);

		this.source.maxClippingBounds = new Cesium.Cartesian3(
			clipHi(c.x[1], min.x, max.x),
			clipHi(c.y[1], min.y, max.y),
			clipHi(c.z[1], min.z, max.z)
		);

		this.map.refresh();
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
		const index = this.getPrimitiveIndex();

		if (index !== -1) {
			const p = this.map.viewer.scene.primitives.get(index);
			this.map.viewer.scene.primitives.remove(p);
		} else {
			this.map.viewer.scene.primitives.remove(this.source);
		}

		this.depthScale?.removeFromScene();
		this.depthScale = null;

		// Drop FXAA suppression so removing this layer restores user setting.
		this.map.options.setFxaaSuppressed(this.config.id.toString(), false);

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
		// FXAA tanks performance with voxel layers so disable it while any voxel layer is visible
		this.map.options.setFxaaSuppressed(this.config.id.toString(), value);
		this.map.refresh();
	}

	public opacityChanged(opacity: number): void {
		if (!this.source) {
			return;
		}

		const alpha = opacityToAlpha(opacity);
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

			this.rebuildShader();

			if (!this.config.cameraPosition && primitive.boundingSphere) {
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(primitive.boundingSphere);
			}

			const { minBounds, maxBounds } = provider;

			if (minBounds && maxBounds) {
				this.bounds = { min: minBounds, max: maxBounds };

				const east = maxBounds.x; // lon
				const nsMiddle = (minBounds.y + maxBounds.y) / 2; // lat

				this.depthScale = new DepthScale(this.map, east, nsMiddle, maxBounds.z, minBounds.z);
				this.depthScale.addToScene();
				this.depthScale.setVisible(get(this.visible));

				this.clipSlider = new VoxelClipSlider(this, this.map, this.bounds);
				const clipControl = new CustomLayerControl();
				clipControl.component = LayerControlVoxelClip;
				clipControl.props = { clipSlider: this.clipSlider };
				this.addCustomControl(clipControl);
			}

			this.map.refresh();
		} catch (error) {
			console.error(`VoxelLayer "${this.config.title}" failed to load:`, error);
		}
	}

	public rebuildShader(): void {
		if (!this.source) {
			return;
		}

		const propName = get(this.selectedProperty);
		const property = get(this.resolvedProperties).find((prop) => prop.name === propName);

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
					value: opacityToAlpha(get(this.opacity))
				},
				// u_hiddenMask is a bitmask: bit N set => category value N is hidden. Toggling a
				// legend entry just flips a bit and calls setUniform, avoids GLSL recompile which is much expensive.
				u_hiddenMask: {
					type: Cesium.UniformType.INT,
					value: packHiddenMask(get(this.hiddenValues).get(property.name))
				}
			},
			// 255.0 is the max UINT8 value, +0.5 for rounding to nearest int when flooring in GLSL
			fragmentShaderText: `
				void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
					int v = int(float(fsInput.metadata.${property.name}) * 255.0 + 0.5);
					material.alpha = u_alpha;
					${noDataGuard}
					// (1 << v) is the mask with only bit v on;
					// & tests whether that bit is set ie category v is hidden.
					if ((u_hiddenMask & (1 << v)) != 0) {
						material.alpha = 0.0; return;
					}
					${branches}
					material.diffuse = vec3(0.5, 0.5, 0.5); // grey default for unknown values, could be made configurable
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
function packHiddenMask(values: Set<number> | undefined): number {
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
