import * as Cesium from "cesium";
import { ticks } from "d3-array";
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
	private unsubscribers: Array<Unsubscriber> = [];

	/**
	 * @param lon            longitude, radians
	 * @param lat            latitude, radians
	 * @param topNap         highest interval top, NAP metres (label + geometry)
	 * @param bottomNap      lowest interval base, NAP metres
	 * @param geoidSeparation ellipsoidal − NAP at this borehole (constant for the
	 *                        column). Ellipsoidal height = NAP + geoidSeparation,
	 *                        which is where the geometry is drawn.
	 */
	constructor(
		private map: Map,
		private lon: number,
		private lat: number,
		private topNap: number,
		private bottomNap: number,
		private geoidSeparation: number
	) {
		this.polylines = new Cesium.PolylineCollection();
		this.labels = new Cesium.LabelCollection();
		this.build();
		this.unsubscribers.push(
			map.options.verticalExaggeration.subscribe(() => this.rebuild()),
			map.options.subsurfaceExaggeration.subscribe(() => this.rebuild())
		);
	}

	/**
	 * NAP metres → rendered ellipsoidal height, matching the tileset: the
	 * subsurface exaggeration stretches away from NAP_OFFSET_M, then the
	 * scene-wide vertical exaggeration scales from the ellipsoid.
	 */
	private ellipsoidal(nap: number): number {
		const vertExag = get(this.map.options.verticalExaggeration) || 1;
		const subExag = get(this.map.options.subsurfaceExaggeration) || 1;
		const trueHeight = nap + this.geoidSeparation;
		return (NAP_OFFSET_M + (trueHeight - NAP_OFFSET_M) * subExag) * vertExag;
	}

	private build(): void {
		this.polylines.add({
			positions: [
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.ellipsoidal(this.topNap)),
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.ellipsoidal(this.bottomNap))
			],
			width: 2,
			material: Cesium.Material.fromType(Cesium.Material.ColorType, {
				color: Cesium.Color.WHITE
			})
		});

		// more ticks with higher exaggeration
		const exaggeration =
			(get(this.map.options.verticalExaggeration) || 1) *
			(get(this.map.options.subsurfaceExaggeration) || 1);
		const targetTicks = exaggeration >= 80 ? 12 : exaggeration >= 40 ? 9 : 6;

		for (const nap of ticks(this.bottomNap, this.topNap, targetTicks)) {
			this.labels.add({
				position: Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.ellipsoidal(nap)),
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
		this.unsubscribers.forEach((unsub) => unsub());
		this.unsubscribers = [];
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
