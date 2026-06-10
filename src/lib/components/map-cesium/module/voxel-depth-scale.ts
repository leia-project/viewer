import * as Cesium from "cesium";
import { get, type Unsubscriber } from "svelte/store";
import type { Map } from "./map";

const NAP_OFFSET_M = 44;

/** Returns the tick interval in meters for a given vertical exaggeration
 * to prevent squishing the labels at low level of vertical exaggeration and to prevent too sparse labels at high vertical exaggeration.
 */
function tickIntervalForVe(vertExag: number): number {
	if (vertExag >= 80) {
		return 5;
	}
	if (vertExag >= 40) {
		return 10;
	}
	if (vertExag >= 15) {
		return 20;
	}

	return 40;
}

export class VoxelDepthScale {
	private polylines: Cesium.PolylineCollection;
	private labels: Cesium.LabelCollection;
	private veUnsubscribe: Unsubscriber;

	constructor(
		private map: Map,
		private lon: number,
		private lat: number,
		private topM: number,
		private bottomM: number
	) {
		this.polylines = new Cesium.PolylineCollection();
		this.labels = new Cesium.LabelCollection();
		this.build(get(map.options.verticalExaggeration));
		this.veUnsubscribe = map.options.verticalExaggeration.subscribe((vertExag) => {
			this.rebuild(vertExag);
		});
	}

	private build(vertExag: number): void {
		this.polylines.add({
			positions: [
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.topM * vertExag),
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.bottomM * vertExag)
			],
			width: 2,
			material: Cesium.Material.fromType(Cesium.Material.ColorType, {
				color: Cesium.Color.WHITE
			})
		});

		const topNap = this.topM - NAP_OFFSET_M;
		const bottomNap = this.bottomM - NAP_OFFSET_M;
		const step = tickIntervalForVe(vertExag);
		const firstTickNap = Math.floor(topNap / step) * step;

		for (let nap = firstTickNap; nap >= bottomNap; nap -= step) {
			const ellipsoidal = nap + NAP_OFFSET_M;

			this.labels.add({
				position: Cesium.Cartesian3.fromRadians(this.lon, this.lat, ellipsoidal * vertExag),
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

	private rebuild(vertExag: number): void {
		this.polylines.removeAll();
		this.labels.removeAll();
		this.build(vertExag);
		this.map.refresh();
	}

	public addToScene(): void {
		this.map.viewer.scene.primitives.add(this.polylines);
		this.map.viewer.scene.primitives.add(this.labels);
	}

	public removeFromScene(): void {
		this.veUnsubscribe();
		this.map.viewer.scene.primitives.remove(this.polylines);
		this.map.viewer.scene.primitives.remove(this.labels);
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
