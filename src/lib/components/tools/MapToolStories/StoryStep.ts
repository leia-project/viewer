import type { CameraLocation } from "$lib/map-core/camera-location";
import type { StoryLayer } from "./StoryLayer";
import type { StoryMarkerCoordinates } from "./Story";

export class StoryStep {
    public title: string;
    public html: string;
    public cameraLocation: CameraLocation;
    public layers: Array<StoryLayer> | undefined;
    public globeOpacity: number;
    public terrain: string | undefined;
    public customComponent: any;
    public markerCoordinates: StoryMarkerCoordinates | Array<StoryMarkerCoordinates> | undefined;

    constructor(title: string, html: string, cameraLocation: CameraLocation, layers: Array<StoryLayer> | undefined = undefined, globeOpacity: number = 100, terrain: string | undefined = undefined, customComponent: any, markerCoordinates: StoryMarkerCoordinates | Array<StoryMarkerCoordinates> | undefined = undefined) {
        this.title = title;
        this.html = html;
        this.cameraLocation = cameraLocation;
        this.layers = layers;
        this.globeOpacity = globeOpacity;
        this.terrain = terrain;
        this.customComponent = customComponent;
        this.markerCoordinates = markerCoordinates;
    }

    getMarkerCoordinatesList(): Array<StoryMarkerCoordinates> {
        if (!this.markerCoordinates) return [];
        return Array.isArray(this.markerCoordinates) ? this.markerCoordinates : [this.markerCoordinates];
    }
}