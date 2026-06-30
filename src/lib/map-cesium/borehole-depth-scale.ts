import * as Cesium from "cesium";
import { get, type Unsubscriber } from "svelte/store";

import { DepthScale } from "./depth-scale";
import type { Map } from "./map";

interface NapExtent {
	topNap: number;
	bottomNap: number;
}

// MAybe don't hardcore strings like "top_nap"/"bottom_nap" but make them configurable here?
/**
 * Draws a DepthScale in NAP along the selected borehole and clears when unselected.
 *
 * The boreholes 3D Tiles glb contains `top_nap`/`bottom_nap` per interval
 * - the full borehole span (NAP) is the highest top / lowest base across all
 *   intervals sharing the clicked feature's `location_uid`, aggregated straight
 *   from the tileset metadata (cached per borehole);
 * - lon/lat and the geoid separation come from the pick point on the cylinder.
 */
export class BoreholeDepthScaleController {
	private depthScale: DepthScale | undefined;
	private unsub: Unsubscriber | undefined;
	private napCache: Record<string, NapExtent> = {};

	constructor(
		private map: Map,
		private getSource: () => Cesium.Cesium3DTileset | undefined,
		private isVisible: () => boolean = () => true
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

		const uid = String(feature.getProperty("location_uid") ?? ""); // MAYBE make id string configurable?
		if (!uid) {
			return;
		}

		// A boreholes intervals all live in the same tile as the clicked interval,
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

		// The pick is in exaggerated scene space undo it to recover the true ellipsoidal hit height
		const vertExag = get(this.map.options.verticalExaggeration) || 1;
		const ellipsoidalHit = cartoPosition.height / vertExag;

		// Geoid separation is constant down a borehole, so estimate it once from
		// the clicked interval's NAP midpoint: ellipsoidal = NAP + separation.
		const napAtHit =
			(toNumber(feature.getProperty("top_nap")) + toNumber(feature.getProperty("bottom_nap"))) / 2;

		const geoidSeparation = ellipsoidalHit - napAtHit;

		this.depthScale = new DepthScale(
			this.map,
			cartoPosition.longitude,
			cartoPosition.latitude,
			nap.topNap,
			nap.bottomNap,
			geoidSeparation
		);
		this.depthScale.addToScene();
	}

	/** Highest top / lowest base (NAP) across every interval of the borehole. */
	private napExtent(uid: string, content: Cesium.Cesium3DTileContent): NapExtent | undefined {
		const cached = this.napCache[uid];
		if (cached) {
			return cached;
		}

		let topNap = -Infinity;
		let bottomNap = Infinity;

		for (let i = 0; i < content.featuresLength; i++) {
			const f = content.getFeature(i);

			if (String(f.getProperty("location_uid")) !== uid) {
				continue;
			}

			const top = toNumber(f.getProperty("top_nap"));
			const bottom = toNumber(f.getProperty("bottom_nap"));

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
