import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import LayerControlStyleWMS from "../../LayerControlStyleWMS/LayerControlStyleWMS.svelte";

export class WmsLayer extends CesiumImageryLayer {
	public styleControl: CustomLayerControl | undefined;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
	}

	async createLayer() {
		const provider = new Cesium.WebMapServiceImageryProvider({
			url: this.config.settings["url"],
			layers: this.config.settings["featureName"],
			parameters: {
				transparent: true,
				format: this.config.settings["contentType"] ? this.config.settings["contentType"] : "image/png",
				//TODO
				// styles: true
			},
		});

		//store styles in here
		var styleNames = [];

		const featureName = this.config.settings["featureName"];

		const url = new String(this.config.settings["url"]);
		const urlBase = url.split("?")[0];
		// Construct the correct DOM URL
		const DOM_String = urlBase + "?request=GetCapabilities";
		console.log('DOM_String', DOM_String)

		this.source = new Cesium.ImageryLayer(provider, {
			alpha: this.getOpacity(this.config.opacity)
		});

		try {
			// Fetch XML data for this domain (e.g. Natuur)
			const response = await fetch(DOM_String);
			if (!response.ok) {
				throw new Error(`Network response was not ok for ${DOM_String}`);
			}

			const xmlText = await response.text();
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

			// Extract layer styles for this theme
			const layers = xmlDoc.getElementsByTagName("Layer");

			//SEARCH FOR LAYER NAME TO GET ITS STYLE
			for (let j = 0; j < layers.length; j++) {
				const layer = layers[j];

				// Get the Name of the layer
				const nameElement = layer.getElementsByTagName("Name")[0];

				if (nameElement) {
					const layerName = nameElement.textContent ?? "";
					//console.log(typeof layerName, typeof featureName);

					if (featureName === layerName){
						// Get all Style elements within the layer
						const styles = layer.getElementsByTagName("Style");
						
						for (let k = 0; k < styles.length; k++) {
							const styleNameElement = styles[k].getElementsByTagName("Name")[0];
							if (styleNameElement) {
								styleNames.push(styleNameElement.textContent);
							}
						}
						console.log(featureName, 'stylenames: ', styleNames)
					}
				}
			}
			//now check if there are styles in there. if there are, add a style dropdown component for the layer
			if (styleNames.length > 0) {
				this.styleControl = new CustomLayerControl();
				this.styleControl.component = LayerControlStyleWMS;
				this.styleControl.props = { styles: styleNames };
				this.addCustomControl(this.styleControl);
			}
		} catch (error) {
			console.error(`There was a problem with the WMS style fetch operation for ${featureName}:`, error);
		}
	}


}
