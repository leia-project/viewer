import * as Cesium from "cesium";
import { ticks } from "d3-array";
import { get, type Unsubscriber } from "svelte/store";
import type { Map } from "./map";

export class DepthScale {
	private polylines: Cesium.PolylineCollection;
	private labels: Cesium.LabelCollection;
	private veUnsubscribe: Unsubscriber;

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
		this.build(get(map.options.verticalExaggeration));
		this.veUnsubscribe = map.options.verticalExaggeration.subscribe((vertExag) => {
			this.rebuild(vertExag);
		});
	}

	/** NAP metres → exaggerated ellipsoidal height, matching the rendered tileset. */
	private ellipsoidal(nap: number, vertExag: number): number {
		return (nap + this.geoidSeparation) * vertExag;
	}

	private build(vertExag: number): void {
		this.polylines.add({
			positions: [
				Cesium.Cartesian3.fromRadians(this.lon, this.lat, this.ellipsoidal(this.topNap, vertExag)),
				Cesium.Cartesian3.fromRadians(
					this.lon,
					this.lat,
					this.ellipsoidal(this.bottomNap, vertExag)
				)
			],
			width: 2,
			material: Cesium.Material.fromType(Cesium.Material.ColorType, {
				color: Cesium.Color.WHITE
			})
		});

		// more ticks with higher exaggeration
		const targetTicks = vertExag >= 80 ? 12 : vertExag >= 40 ? 9 : 6;

		for (const nap of ticks(this.bottomNap, this.topNap, targetTicks)) {
			this.labels.add({
				position: Cesium.Cartesian3.fromRadians(
					this.lon,
					this.lat,
					this.ellipsoidal(nap, vertExag)
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

	private rebuild(vertExag: number): void {
		this.polylines.removeAll();
		this.labels.removeAll();
		this.build(vertExag);
		this.map.refresh();
	}

	public addToScene(): void {
		this.map.viewer.scene.primitives.add(this.polylines);
		this.map.viewer.scene.primitives.add(this.labels);
		// Show depth scale immediately
		this.map.refresh();
	}

	public removeFromScene(): void {
		this.veUnsubscribe();
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
