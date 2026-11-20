import * as Cesium from "cesium";
import { get, type Unsubscriber } from "svelte/store";
import { depthTicks } from "./depth-ticks";
import type { Map } from "./map";
import { toRenderedHeight, type VerticalDatum } from "./subsurface-exaggeration";

function formatDatumHeight(z: number, datum: VerticalDatum): string {
	const rounded = Math.round(z * 10) / 10; // round to decimeters
	const sign = rounded > 0 ? "+" : "";

	return `${sign}${rounded}m ${datum.name}`;
}

export interface DepthScaleOptions {
	/** Draw the vertical line spanning the scale. */
	showLine?: boolean;
}

export class DepthScale {
	private polylines: Cesium.PolylineCollection;
	private labels: Cesium.LabelCollection;
	private unsubscribers: Array<Unsubscriber>;
	private showLine: boolean;

	/**
	 * @param top    highest interval top, metres in the map's vertical datum
	 * @param bottom lowest interval base, metres in the map's vertical datum
	 */
	constructor(
		private map: Map,
		private lon: number,
		private lat: number,
		private top: number,
		private bottom: number,
		options: DepthScaleOptions = {}
	) {
		this.showLine = options.showLine ?? true;

		this.polylines = new Cesium.PolylineCollection();
		this.labels = new Cesium.LabelCollection();
		// Builds now and on every exaggeration change
		this.unsubscribers = [map.options.exaggeration.subscribe(() => this.rebuild())];
	}

	public setPosition(lon: number, lat: number): void {
		if (lon === this.lon && lat === this.lat) {
			return;
		}

		this.lon = lon;
		this.lat = lat;
		this.rebuild();
	}

	private build(): void {
		// Labels show datum heights, placed where the layer renders them
		const factors = get(this.map.options.exaggeration);
		const datum = get(this.map.options.verticalDatum);

		const displayHeight = (height: number) => toRenderedHeight(height + datum.offset, factors);

		if (this.showLine) {
			this.polylines.add({
				positions: [
					Cesium.Cartesian3.fromRadians(this.lon, this.lat, displayHeight(this.top)),
					Cesium.Cartesian3.fromRadians(this.lon, this.lat, displayHeight(this.bottom))
				],
				width: 2,
				material: Cesium.Material.fromType(Cesium.Material.ColorType, {
					color: Cesium.Color.WHITE
				})
			});
		}

		const ticks = depthTicks(this.top, this.bottom, factors.subsurface * factors.scene);

		for (const tick of ticks) {
			this.labels.add({
				position: Cesium.Cartesian3.fromRadians(this.lon, this.lat, displayHeight(tick)),
				text: `— ${formatDatumHeight(tick, datum)}`,
				font: "14px sans-serif",
				fillColor: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 2,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
				verticalOrigin: Cesium.VerticalOrigin.CENTER,
				pixelOffset: new Cesium.Cartesian2(4, 0)
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
