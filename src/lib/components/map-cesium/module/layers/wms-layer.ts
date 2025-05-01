import type { LayerConfig } from "$lib/components/map-core/layer-config";
import * as Cesium from "cesium";
import type { Map } from "../map";
import { CesiumImageryLayer } from "./imagery-layer";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import LayerControlStyleWMS from "../../LayerControlStyleWMS/LayerControlStyleWMS.svelte";

export class WmsLayer extends CesiumImageryLayer {
  public styleControl: CustomLayerControl | undefined;
  private _controlInitialized = false;

  constructor(map: Map, config: LayerConfig) {
    super(map, config);
  }

  /**
   * Creates (or re-creates) the WMS layer + control.
   */
  public async createLayer(selectedStyle = ""): Promise<void> {
    // 1) fetch GetCapabilities, extract styleNames...
    const styleNames: string[] = [];
    const featureName = this.config.settings["featureName"];
    const urlBase = (this.config.settings["url"] as string).split("?")[0];
    const capsUrl = `${urlBase}?request=GetCapabilities`;

    try {
      const response = await fetch(capsUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${capsUrl}`);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const layers = xmlDoc.getElementsByTagName("Layer");

      for (let layerEl of Array.from(layers)) {
        const nameEl = layerEl.getElementsByTagName("Name")[0];
        if (nameEl?.textContent === featureName) {
          for (let styleEl of Array.from(layerEl.getElementsByTagName("Style"))) {
            const n = styleEl.getElementsByTagName("Name")[0]?.textContent;
            if (n) styleNames.push(n);
          }
        }
      }
    } catch (e) {
      console.error(`WMS style fetch error for ${featureName}:`, e);
    }

    // 2) only add the dropdown control *once*
    if (styleNames.length > 0 && !this._controlInitialized) {
      this.styleControl = new CustomLayerControl();
      this.styleControl.component = LayerControlStyleWMS;
      this.styleControl.props = {
        styles: styleNames,
        layer: this, // pass the instance so the component can call updateStyle
      };
      this.addCustomControl(this.styleControl);
      this._controlInitialized = true;
    }

    // 3) build the imagery provider (with optional selectedStyle)
    await this._applyWmsProvider(selectedStyle);
  }

  /**
   * (Re)builds just the Cesium provider with a given style.
   */
  private async _applyWmsProvider(style: string): Promise<void> {
    const urlBase = (this.config.settings["url"] as string).split("?")[0];
    const finalUrl = style ? `${urlBase}?styles=${style}` : urlBase;

    const provider = new Cesium.WebMapServiceImageryProvider({
      url: finalUrl,
      layers: this.config.settings["featureName"],
      parameters: {
        transparent: true,
        format: this.config.settings["contentType"] ?? "image/png",
      },
    });

    // swap in your new imagery layer
    this.source = new Cesium.ImageryLayer(provider, {
      alpha: this.getOpacity(this.config.opacity),
    });
  }

  /**
   * Public API for your Svelte component to call
   * when the user picks a new style.
   */
  public async updateStyle(style: string): Promise<void> {
    await this._applyWmsProvider(style);
  }
}
