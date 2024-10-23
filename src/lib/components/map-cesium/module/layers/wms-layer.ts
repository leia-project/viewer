import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";

import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import { type Writable, writable, get } from "svelte/store";

export class WmsLayer extends CesiumImageryLayer {
	private WMSStyleControl: CustomLayerControl | undefined;

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

		const featureName = new String(this.config.settings["featureName"]);

		const url = new String(this.config.settings["url"]);
		const urlSplit = url.split("?");
		const urlBase = urlSplit[0];
		// Construct the correct DOM URL
		const DOM_String = urlBase + "?request=GetCapabilities";
		console.log('DOM_String', DOM_String)
		console.log('featureName', this.config.settings["featureName"])


		//TODO
		console.log('SIUUUUUUUUUUU');
		this.config.settings.wms_styles = true ;
		console.log(this.config.settings.wms_styles);
		this.source = new Cesium.ImageryLayer(provider, {
			alpha: this.getOpacity(this.config.opacity)
		});

		//here add the styling, only then add the WMS styles to settings
		// Create an object to combine layers' styles from each theme
		const allLayerStyles = {};

		

		try {
			// Fetch XML data for each theme
			const response = await fetch(DOM_String);
			if (!response.ok) {
				throw new Error(`Network response was not ok for theme ${DOM_String}`);
			}

			const xmlText = await response.text();
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

			// Extract layer styles for this theme
			const themeLayerStyles: { [key: string]: any[] } = {};
			const layers = xmlDoc.getElementsByTagName("Layer");

			//SEARCH FOR LAYER NAME TO GET ITS STYLE
			for (let j = 0; j < layers.length; j++) {
				const layer = layers[j];

				// Get the Name of the layer
				const nameElement = layer.getElementsByTagName("Name")[0];

				if (nameElement) {
					const layerName = nameElement.textContent ?? "";

					if (featureName === layerName){
						console.log(nameElement, layers);
						// Get all Style elements within the layer
						const styles = layer.getElementsByTagName("Style");
						var styleNames = [];

						for (let k = 0; k < styles.length; k++) {
							const styleNameElement = styles[k].getElementsByTagName("Name")[0];
							if (styleNameElement) {
								styleNames.push(styleNameElement.textContent);
							}
						}
					};
				}
				//error: undefined?
				console.log('stylenames: ', styleNames)
			}

			// Merge the current theme's layer styles with the overall dictionary
			Object.assign(allLayerStyles, themeLayerStyles);

		} catch (error) {
			console.error(`There was a problem with the fetch operation for theme ${XMLTheme}:`, error);
		}
		//


		if (this.config.settings["wms_styles"]) {
			const wms_styles = this.config.settings["wms_styles"];

			const WMSStyleSelectedCondition = this.getWMSStyleConditionSelected();
			for (let i = 0; i < wms_styles.length; i++) {
				wms_styles[i].conditions.unshift(WMSStyleSelectedCondition);
			}

			this.WMSStyleControl = new CustomLayerControl();
			this.WMSStyleControl.component = LayerControlWMSStyle;
			this.WMSStyleControl.props = { layer: this, themes: wms_styles, DefaultWMS_Style: this.config.settings["DefaultWMS_Style"] };
			this.addCustomControl(this.WMSStyleControl);
		}
	}

	public getWMSStyleConditionSelected(): Array<string> {
		const selectedColor = get(this.map.featureInfo.selectedFeatureColor);
		const selectedPropperty = this.map.featureInfoHandler.selectedProperty;
		return [`\${${selectedPropperty}} === 'true'`, `color("${selectedColor}")`];
	}

	//TEST
	// Function to fetch XML data and handle asynchronous operations correctly
	async fetchXMLData() {
		const XMLTheme = ['natuur', 'recreatie', 'economie', 'chs', 'bodem', 'Archeologie']; //TODO: GOTTA FIND EM ALL

		// Create an object to combine layers' styles from each theme
		const allLayerStyles = {};

		// Loop through each theme and fetch its corresponding XML data
		for (let i = 0; i < XMLTheme.length; i++) {
			const theme = XMLTheme[i];

			// Construct the correct URL
			const DOM_String = `https://opengeodata.zeeland.nl/geoserver/${theme}/wms?request=GetCapabilities`;

			try {
				// Fetch XML data for each theme
				const response = await fetch(DOM_String);
				if (!response.ok) {
					throw new Error(`Network response was not ok for theme ${theme}`);
				}

				const xmlText = await response.text();
				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

				// Extract layer styles for this theme
				const themeLayerStyles = {};
				const layers = xmlDoc.getElementsByTagName("Layer");

				for (let j = 0; j < layers.length; j++) {
					const layer = layers[j];

					// Get the Name of the layer
					const nameElement = layer.getElementsByTagName("Name")[0];
					if (nameElement) {
						const layerName = nameElement.textContent;

						// Get all Style elements within the layer
						const styles = layer.getElementsByTagName("Style");
						const styleNames = [];

						for (let k = 0; k < styles.length; k++) {
							const styleNameElement = styles[k].getElementsByTagName("Name")[0];
							if (styleNameElement) {
								styleNames.push(styleNameElement.textContent);
							}
						}

						// Add the layer and its styles to the theme's dictionary
						themeLayerStyles[layerName] = styleNames;
						console.log('themeLayerStyles:', themeLayerStyles);
					}
				}

				// Merge the current theme's layer styles with the overall dictionary
				Object.assign(allLayerStyles, themeLayerStyles);

			} catch (error) {
				console.error(`There was a problem with the fetch operation for theme ${theme}:`, error);
			}
		}

	// Log the final combined result
	console.log('All Layer Styles:', allLayerStyles);
	};
	//TEST
}
