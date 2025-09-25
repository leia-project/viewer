import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

export class WmsLayer extends CesiumImageryLayer {

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		const refreshRate = this.config.settings["refreshRate"] ?? undefined;
		console.log("Refresh rate: " + refreshRate);

		if (refreshRate && refreshRate > 0) {
			//test 1 time refresh
			// setTimeout(() => this.refreshLayer(), refreshRate * 1000);
			// console.log("Refresh timeout set for 5 seconds: " + refreshRate * 1000);

			let intervalId: NodeJS.Timeout = setInterval(this.refreshLayer, refreshRate * 1000);
			console.log("refreshing layer every " + this.config.settings["refreshRate"] + " seconds");
		}
	}

	// stopInterval(): void {
	// 	clearInterval(intervalId);
	// 	console.log("Interval has been stopped.");
	// }

	createLayer() {
		// const time = this.map.viewer.clock.currentTime;
		const clock = this.map.viewer.clock;
		console.log(clock, "clock");
		console.log(this.config.settings["refreshRate"], "refreshRate");

		const provider = new Cesium.WebMapServiceImageryProvider({
			url: this.config.settings["url"],
			layers: this.config.settings["featureName"],
			parameters: {
				transparent: true,
				format: this.config.settings["contentType"] ? this.config.settings["contentType"] : "image/png",
				clock: clock
			},

		});
		this.source = new Cesium.ImageryLayer(provider, {
			alpha: this.getOpacity(this.config.opacity)
		});
	}
}
