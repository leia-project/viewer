import type { CameraLocation } from "$lib/map-core/camera-location";
import type { StoryLayer } from "./StoryLayer";
import type { StoryMarkerCoordinates } from "./Story";

export interface StoryOpacitySliderGroup {
    key: string;
    label?: string;
    layers: Array<StoryLayer>;
}

export class StoryOpacitySliderConfigError extends Error {
    public readonly group: string;

    constructor(public readonly stepTitle: string, group: unknown) {
        super(`Invalid opacitySliderGroup "${String(group)}" in story step "${stepTitle}": use a non-empty name and matching opacities between 0 and 100.`);
        this.name = "StoryOpacitySliderConfigError";
        this.group = String(group);
    }
}

export class StoryStep {
    public title: string;
    public html: string;
    public cameraLocation: CameraLocation;
    public layers: Array<StoryLayer> | undefined;
    public globeOpacity: number;
    public terrain: string | undefined;
    public customComponent: any;
    public markerCoordinates: StoryMarkerCoordinates | Array<StoryMarkerCoordinates> | undefined;
    public opacitySliderGroups: Array<StoryOpacitySliderGroup>;

    constructor(title: string, html: string, cameraLocation: CameraLocation, layers: Array<StoryLayer> | undefined = undefined, globeOpacity: number = 100, terrain: string | undefined = undefined, customComponent: any, markerCoordinates: StoryMarkerCoordinates | Array<StoryMarkerCoordinates> | undefined = undefined) {
        this.title = title;
        this.html = html;
        this.cameraLocation = cameraLocation;
        this.layers = layers;
        this.globeOpacity = globeOpacity;
        this.terrain = terrain;
        this.customComponent = customComponent;
        this.markerCoordinates = markerCoordinates;
        this.opacitySliderGroups = this.createOpacitySliderGroups();
    }

    private createOpacitySliderGroups(): Array<StoryOpacitySliderGroup> {
        const groups = new Array<StoryOpacitySliderGroup>();
        const groupsByName = new Map<string, StoryOpacitySliderGroup>();

        for (const [index, layer] of (this.layers ?? []).entries()) {
            const name = layer.opacitySliderGroup;
            if (name === undefined) {
                groups.push({ key: `layer:${index}`, layers: [layer] });
                continue;
            }

            if (typeof name !== "string" || name.trim().length === 0
                || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 100) {
                throw new StoryOpacitySliderConfigError(this.title, name);
            }

            const label = name.trim();
            const group = groupsByName.get(label);
            if (group) {
                if (group.layers[0].opacity !== layer.opacity) {
                    throw new StoryOpacitySliderConfigError(this.title, name);
                }
                group.layers.push(layer);
            } else {
                const newGroup = { key: `group:${label}`, label, layers: [layer] };
                groupsByName.set(label, newGroup);
                groups.push(newGroup);
            }
        }

        return groups;
    }

    getMarkerCoordinatesList(): Array<StoryMarkerCoordinates> {
        if (!this.markerCoordinates) return [];
        return Array.isArray(this.markerCoordinates) ? this.markerCoordinates : [this.markerCoordinates];
    }
}