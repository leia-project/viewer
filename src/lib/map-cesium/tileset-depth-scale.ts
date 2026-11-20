import * as Cesium from "cesium";
import { type Readable, type Unsubscriber, derived } from "svelte/store";

import { DepthScale } from "./depth-scale";
import type { Map } from "./map";
import type { LayerConfig } from "$lib/map-core/layer-config";

/** Column top and bottom in datum metres */
interface ColumnExtent {
	top: number;
	bottom: number;
}

/** Metadata property names a tileset of vertical columns (boreholes, CPTs,
 * wells) must carry per interval for the click depth scale */
export interface DepthScaleKeys {
	/** Groups the intervals of one column */
	id: string;
	/** Interval top, metres in the map's vertical datum */
	top: string;
	/** Interval base, metres in the map's vertical datum */
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
 * Draws a DepthScale along the selected column of a subsurface 3D Tiles layer
 * (borehole, CPT, ...) while the layer is visible.
 *
 * The column spans the highest top to the lowest base of the intervals sharing
 * the clicked feature's id, at the pick point. Tilesets without the id property
 * never show a scale.
 */
export class TilesetDepthScaleController {
	private depthScale: DepthScale | undefined;
	private unsub: Unsubscriber | undefined;

	constructor(
		private map: Map,
		private getSource: () => Cesium.Cesium3DTileset | undefined,
		private visible: Readable<boolean>,
		private keys: DepthScaleKeys = DEFAULT_DEPTH_SCALE_KEYS
	) {}

	public start(): void {
		if (this.unsub) {
			return;
		}
		// Hiding the layer keeps the feature selected, so follow visibility too.
		// Pass the tuple on: a derived boolean would skip clicks while visible stays true
		this.unsub = derived([this.map.featureInfo.results, this.visible], (values) => values).subscribe(
			([, visible]) => this.sync(visible)
		);
	}

	public stop(): void {
		this.unsub?.();
		this.unsub = undefined;
		this.clear();
	}

	private sync(visible: boolean): void {
		this.clear();
		if (!visible) {
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

		const extent = this.columnExtent(uid, content);
		if (!extent) {
			return;
		}

		const cartoPosition = Cesium.Cartographic.fromCartesian(position);
		if (!cartoPosition) {
			return;
		}

		this.depthScale = new DepthScale(
			this.map,
			cartoPosition.longitude,
			cartoPosition.latitude,
			extent.top,
			extent.bottom,
			{ showLine: false }
		);
		this.depthScale.addToScene();
	}

	/** Highest top / lowest base across the column's intervals */
	private columnExtent(uid: string, content: Cesium.Cesium3DTileContent): ColumnExtent | undefined {
		let top = -Infinity;
		let bottom = Infinity;

		for (let i = 0; i < content.featuresLength; i++) {
			const f = content.getFeature(i);

			if (String(f.getProperty(this.keys.id)) !== uid) {
				continue;
			}

			const intervalTop = toNumber(f.getProperty(this.keys.top));
			const intervalBottom = toNumber(f.getProperty(this.keys.bottom));

			if (Number.isFinite(intervalTop)) {
				top = Math.max(top, intervalTop);
			}

			if (Number.isFinite(intervalBottom)) {
				bottom = Math.min(bottom, intervalBottom);
			}
		}

		if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
			return undefined;
		}

		return { top, bottom };
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
