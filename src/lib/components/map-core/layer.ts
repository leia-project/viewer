import { writable, get } from "svelte/store";
import { LayerConfig } from "./layer-config.js";
import { CustomLayerControl } from "./custom-layer-control.js";

import type { Writable } from "svelte/store";
import { CameraLocation } from "./camera-location.js";

export abstract class Layer {
  public config: LayerConfig;
  public visible: Writable<boolean>;
  public opacity: Writable<number>;
  public customControls: Writable<Array<CustomLayerControl>>;
  public parentGroup: string|number;

  constructor(
    config: LayerConfig,
    visible: boolean = true,
  ) {
    if(!config.id) {
      throw new Error("Layer must have an ID");
    }
    
    this.config = config;
    this.visible = writable(visible);
    this.opacity = writable(!config.opacity || config.opacity === 0 ? 100 : 100 - config.opacity);
    this.customControls = writable<Array<CustomLayerControl>>(new Array<CustomLayerControl>());

    this.visible.subscribe((visible) => {
      if (visible) {
        this.show();
      } else {
        this.hide();
      }
    });
    this.opacity.subscribe((value) => this.opacityChanged(value));
    this.parentGroup = config.groupId;
  }

  public addCustomControl(control: CustomLayerControl) {
    const controls = get(this.customControls);
    this.customControls.set([...controls, control]);
  }

  public removeCustomControl(control: CustomLayerControl) {
    const controls = get(this.customControls);
    for(let i = 0; i < controls.length; i++) {
      if(controls[i].component === control.component) {
        controls.splice(i, 1);
        break;
      }
    }

    this.customControls.set(controls);
  }

  public get id(): string {
      return this.config.id.toString();
  }

  public get title(): string {
      return this.config.title;
  }

  public remove(): void {
    this.config.added.set(false);
  }

  public getLayerPosition(): CameraLocation | undefined {
      return this.config.cameraPosition ?? undefined;
  }

  protected abstract show(): void;
  protected abstract hide(): void;
  protected abstract opacityChanged(opacity: number): void;
}
