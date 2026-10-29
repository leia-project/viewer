import * as Cesium from "cesium";
import { get, type Unsubscriber } from "svelte/store";

import { DepthScale, NAP_OFFSET_M } from "./depth-scale";
import type { Map } from "./map";
import type { LayerConfig } from "$lib/map-core/layer-config";

interface NapExtent {
	topNap: number;
	bottomNap: number;
}

/** Metadata property names a tileset of vertical columns (boreholes, CPTs,
 * wells) must carry per interval for the click depth scale */
export interface DepthScaleKeys {
	/** Groups the intervals of one column */
	id: string;
	/** Interval top, metres NAP */
	top: string;
	/** Interval base, metres NAP */
	bottom: string;
}

/** Defaults match the BRO BHR-GT / CPT tilesets */
export const DEFAULT_DEPTH_SCALE_KEYS: DepthScaleKeys = {
	id: "bro_id",
	top: "top_nap",
	bottom: "bottom_nap"
};

/** `settings.depthScale` of a 3D Tiles layer, merged over the BRO defaults */
export function depthScaleKeys(config: LayerConfig): DepthScaleKeys {
	return { ...DEFAULT_DEPTH_SCALE_KEYS, ...(config.settings?.depthScale ?? {}) };
}

/**
 * Draws a DepthScale in NAP along the selected column of a subsurface 3D Tiles
 * layer (borehole, CPT, ...) and clears when unselected.
 *
 * Every interval is a feature carrying the `keys` metadata
 * - the full column span (NAP) is the highest top / lowest base across all
 *   intervals sharing the clicked feature's id, aggregated straight from the
 *   tileset metadata (cached per id);
 * - lon/lat and the geoid separation come from the pick point on the column.
 * Tilesets without the id property simply never show a scale.
 */
export class TilesetDepthScaleController {
	private depthScale: DepthScale | undefined;
	private unsub: Unsubscriber | undefined;
	private napCache: Record<string, NapExtent> = {};

	constructor(
		private map: Map,
		private getSource: () => Cesium.Cesium3DTileset | undefined,
		private isVisible: () => boolean = () => true,
		/** Ellipsoidal height the companion tileset stretches away from. */
		private pivot: number = NAP_OFFSET_M,
		private keys: DepthScaleKeys = DEFAULT_DEPTH_SCALE_KEYS
	) {}

	public start(): void {
		if (this.unsub) {
			return;
		}
		this.unsub = this.map.featureInfo.results.subscribe(() => this.sync());
	}

	public stop(): void {
		this.unsub?.();
		this.unsub = undefined;
		this.clear();
	}

	private sync(): void {
		this.clear();
		if (!this.isVisible()) {
			return;
		}

		const handler = this.map.featureInfoHandler;
		const feature = handler.selected3DTileFeature;
		const source = this.getSource();
		const position = handler.selectedFeaturePosition;
		if (!feature || !source || feature.tileset !== source || !position) {
			return;
		}

		const uid = String(feature.getProperty(this.keys.id) ?? "");
		if (!uid) {
			return;
		}

		// A column's intervals all live in the same tile as the clicked interval,
		// aggregate from the clicked feature's own tile content
		const content = (
			feature as Cesium.Cesium3DTileFeature & { content?: Cesium.Cesium3DTileContent }
		).content; // cesium is missing this type

		if (!content) {
			return;
		}

		const nap = this.napExtent(uid, content);
		if (!nap) {
			return;
		}

		const cartoPosition = Cesium.Cartographic.fromCartesian(position);
		if (!cartoPosition) {
			return;
		}

		// The pick is in exaggerated scene space. undo the scene-wide vertical
		// exaggeration and then the subsurface pivot stretch to recover the
		// true ellipsoidal hit height.
		const vertExag = get(this.map.options.verticalExaggeration) || 1;
		const subExag = get(this.map.options.subsurfaceExaggeration) || 1;
		const ellipsoidalHit =
			this.pivot + (cartoPosition.height / vertExag - this.pivot) / subExag;

		// Geoid separation is constant down a borehole, so estimate it once from
		// the clicked interval's NAP midpoint: ellipsoidal = NAP + separation.
		const napAtHit =
			(toNumber(feature.getProperty(this.keys.top)) + toNumber(feature.getProperty(this.keys.bottom))) / 2;

		const geoidSeparation = ellipsoidalHit - napAtHit;

		// The tileset stretches from this.pivot (see subsurface-exaggeration.ts)
		// and is scene-exaggerated as 3D Tiles; labels read exact NAP via the
		// column's geoid separation.
		this.depthScale = new DepthScale(
			this.map,
			cartoPosition.longitude,
			cartoPosition.latitude,
			nap.topNap + geoidSeparation,
			nap.bottomNap + geoidSeparation,
			{
				pivotZ: this.pivot,
				labelDatum: geoidSeparation,
				applyVerticalExaggeration: true,
				showLine: false
			}
		);
		this.depthScale.addToScene();
	}

	/** Highest top / lowest base (NAP) across every interval of the column. */
	private napExtent(uid: string, content: Cesium.Cesium3DTileContent): NapExtent | undefined {
		const cached = this.napCache[uid];
		if (cached) {
			return cached;
		}

		let topNap = -Infinity;
		let bottomNap = Infinity;

		for (let i = 0; i < content.featuresLength; i++) {
			const f = content.getFeature(i);

			if (String(f.getProperty(this.keys.id)) !== uid) {
				continue;
			}

			const top = toNumber(f.getProperty(this.keys.top));
			const bottom = toNumber(f.getProperty(this.keys.bottom));

			if (Number.isFinite(top)) {
				topNap = Math.max(topNap, top);
			}

			if (Number.isFinite(bottom)) {
				bottomNap = Math.min(bottomNap, bottom);
			}
		}

		if (!Number.isFinite(topNap) || !Number.isFinite(bottomNap)) {
			return undefined;
		}

		const extent: NapExtent = { topNap, bottomNap };
		this.napCache[uid] = extent;

		return extent;
	}

	private clear(): void {
		if (this.depthScale) {
			this.depthScale.removeFromScene();
			this.depthScale = undefined;
		}
	}
}

function toNumber(value: unknown): number {
	return typeof value === "number" ? value : Number(value);
}
