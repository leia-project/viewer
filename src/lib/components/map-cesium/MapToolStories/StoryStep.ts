import type { CameraLocation } from "$lib/components/map-core/camera-location";
import type { StoryLayer } from "./StoryLayer";

export class StoryStep {
    public title: string;
    public html: string;
    public cameraLocation: CameraLocation;
    public layers: Array<StoryLayer> | undefined;
    public globeOpacity: number;
    public terrain: string | undefined;
    public customComponent: any;

    constructor(title: string, html: string, cameraLocation: CameraLocation, layers: Array<StoryLayer> | undefined = undefined, globeOpacity: number = 100, terrain: string | undefined = undefined, customComponent: any) {
        this.title = title;
        this.html = html;
        this.cameraLocation = cameraLocation;
        this.layers = layers;
        this.globeOpacity = globeOpacity;
        this.terrain = terrain;
        this.customComponent = customComponent;
    }
}