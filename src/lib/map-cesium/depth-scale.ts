import * as Cesium from "cesium";
import { get, type Unsubscriber } from "svelte/store";
import type { Map } from "./map";

/**
 * Approximate ellipsoidal height of NAP 0 in Zeeland which we take as the datum the subsurface
 * exaggeration stretches away from.
 * This is shared by all subsurface layers (voxels, boreholes, CPT')
 * so equal NAP depths render at equal heights.
 * Columns on terrain above NAP 0 rise proportionally above the (unstretched) terrain
 * by design
 */
export const NAP_OFFSET_M = 44;

export class DepthScale {
	private polylines: Cesium.PolylineCollection;
	private labels: Cesium.LabelCollection;
	private unsubscribers: Array<Unsubscriber>;

	/**
	 * @param topM       highest interval top, true (ellipsoidal) metres
	 * @param bottomM    lowest interval base, true (ellipsoidal) metres
	 * @param pivotZ     datum the subsurface exaggeration stretches away from;
	 *                   pass the companion layer's pivot so the scale stretches
	 *                   like the layer
	 * @param labelDatum ellipsoidal height whose label reads 0m NAP. Defaults to
	 *                   pivotZ; pass the column's geoid separation for exact NAP
	 *                   labels.
	 * @param applyVerticalExaggeration additionally scale rendered heights by the
	 *                   scene-wide vertical exaggeration. Needed next to 3D Tiles
	 *                   layers (boreholes, CPTs), which Cesium scene-exaggerates;
	 *                   voxel primitives are not scene-exaggerated.
	 */
	constructor(
		private map: Map,
		private lon: number,
		private lat: number,
		private topM: number,
		private bottomM: number,
		private pivotZ: number = NAP_OFFSET_M,
		private labelDatum: number = pivotZ,
		private applyVerticalExaggeration: boolean = false
	) {
		this.polylines = new Cesium.PolylineCollection();
		this.labels = new Cesium.LabelCollection();
		// Force initial build of depth scale and subscribe to subsurface ex. changes
		this.unsubscribers = [map.options.subsurfaceExaggeration.subscribe(() => this.rebuild())];
		if (applyVerticalExaggeration) {
			this.unsubscribers.push(map.options.verticalExaggeration.subscribe(() => this.rebuild()));
		}
	}

	public setPosition(lon: number, lat: number): void {
		if (lon === this.lon && lat === this.lat) {
			return;
		}

		this.lon = lon;
		this.lat = lat;
		this.rebuild();
	}

	/**
	 * True height to rendered height: the subsurface exaggeration stretches
	 * away from the pivot datum (same formula as {@link VoxelLayer.stretchZ},
	 * so pass the layer's pivot), matching what happens to the voxels. Labels
	 * keep true depths at stretched positions.
	 */
	private displayHeight(ellipsoidal: number): number {
		const k = get(this.map.options.subsurfaceExaggeration);
		const stretched = this.pivotZ + k * (ellipsoidal - this.pivotZ);

		return this.applyVerticalExaggeration
			? stretched * (get(this.map.options.verticalExaggeration) || 1)
			: stretched;
	}

	/** Total stretch applied to the column, used to pick a fitting tick interval. */
	private effectiveExaggeration(): number {
		const subExag = get(this.map.options.subsurfaceExaggeration);

		return this.applyVerticalExaggeration
			? subExag * (get(this.map.options.verticalExaggeration) || 1)
			: subExag;
	}

	private build(): void {
		this.polylines.add({
			positions: [
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.displayHeight(this.topM)),
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.displayHeight(this.bottomM))
			],
			width: 2,
			material: Cesium.Material.fromType(Cesium.Material.ColorType, {
				color: Cesium.Color.WHITE
			})
		});

		const topNap = this.topM - this.labelDatum;
		const bottomNap = this.bottomM - this.labelDatum;
		const step = tickIntervalForVe(this.effectiveExaggeration());
		const firstTickNap = Math.floor(topNap / step) * step;

		for (let nap = firstTickNap; nap >= bottomNap; nap -= step) {
			const ellipsoidal = nap + this.labelDatum;

			this.labels.add({
				position: Cesium.Cartesian3.fromRadians(
					this.lon,
					this.lat,
					this.displayHeight(ellipsoidal)
				),
				text: formatNap(nap),
				font: "14px sans-serif",
				fillColor: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 2,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
				verticalOrigin: Cesium.VerticalOrigin.CENTER,
				pixelOffset: new Cesium.Cartesian2(8, 0)
			});
		}
	}

	private rebuild(): void {
		this.polylines.removeAll();
		this.labels.removeAll();
		this.build();
		this.refreshWithLabels();
	}

	public addToScene(): void {
		this.map.viewer.scene.primitives.add(this.polylines);
		this.map.viewer.scene.primitives.add(this.labels);
		this.refreshWithLabels();
	}

	/**
	 * Render now and once more after this frame: label glyphs are written to
	 * the texture atlas during the first render pass, so with requestRenderMode
	 * the tick text would stay invisible until the camera moves.
	 */
	private refreshWithLabels(): void {
		this.map.refresh();
		const scene = this.map.viewer.scene;
		const unlisten = scene.postRender.addEventListener(() => {
			unlisten();
			this.map.refresh();
		});
	}

	public removeFromScene(): void {
		this.unsubscribers.forEach((unsubscribe) => unsubscribe());
		this.map.viewer.scene.primitives.remove(this.polylines);
		this.map.viewer.scene.primitives.remove(this.labels);
		this.map.refresh();
	}

	public setVisible(visible: boolean): void {
		this.polylines.show = visible;
		this.labels.show = visible;
		this.map.refresh();
	}
}

function formatNap(z: number) {
	const sign = z > 0 ? "+" : "";

	return `${sign}${z}m NAP`;
}

/** Returns the tick interval in meters for a given vertical exaggeration
 * to prevent squishing the labels at low level of vertical exaggeration
 * and to prevent too sparse labels at high vertical exaggeration.
 */
function tickIntervalForVe(vertExag: number): number {
	if (vertExag >= 80) {
		return 10;
	}
	if (vertExag >= 40) {
		return 15;
	}
	if (vertExag >= 15) {
		return 20;
	}

	return 40;
}
