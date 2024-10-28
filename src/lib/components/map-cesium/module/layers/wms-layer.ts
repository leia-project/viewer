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

	public async createLayer(selectedStyle="") {

		// Extract all layer styles before creating the layer
		var styleNames = [];

		const featureName = this.config.settings["featureName"];

		var url = this.config.settings["url"];
		const urlString = new String(url);
		const urlBase = urlString.split("?")[0];

		// Construct the correct DOM URL
		const DOM_String = urlBase + "?request=GetCapabilities";
		console.log('DOM_String', DOM_String)

		try {
			// Fetch XML data
			const response = await fetch(DOM_String);
			if (!response.ok) {
				throw new Error(`Network response was not ok for ${DOM_String}`);
			}

			const xmlText = await response.text();
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

			// Extract layers
			const layers = xmlDoc.getElementsByTagName("Layer");

			// Search for layer name to get its styles
			for (let j = 0; j < layers.length; j++) {
				const layer = layers[j];

				// Get the layer name
				const nameElement = layer.getElementsByTagName("Name")[0];

				if (nameElement) {
					const layerName = nameElement.textContent ?? "";
					//console.log(typeof layerName, typeof featureName);

					// Get all style elements within the layer
					if (featureName === layerName){
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

			// Ceck if there are styles. if there are, add a style dropdown component for the layer
			if (styleNames.length > 0) {
				this.styleControl = new CustomLayerControl();
				this.styleControl.component = LayerControlStyleWMS;
				this.styleControl.props = { styles: styleNames };
				this.addCustomControl(this.styleControl);
			}
		} catch (error) {
			console.error(`There was a problem with the WMS style fetch operation for ${featureName}:`, error);
		}
		
		// Update url with style selected
		if (selectedStyle !== "") {
			url = urlBase + `?styles=${selectedStyle}`
		}

		// Now construct the layer with the url, using a style if necessary
		const provider = new Cesium.WebMapServiceImageryProvider({
			url: url,
			layers: this.config.settings["featureName"],
			parameters: {
				transparent: true,
				format: this.config.settings["contentType"] ? this.config.settings["contentType"] : "image/png",
			},
		});

		this.source = new Cesium.ImageryLayer(provider, {
			alpha: this.getOpacity(this.config.opacity)
		});

	}
}
