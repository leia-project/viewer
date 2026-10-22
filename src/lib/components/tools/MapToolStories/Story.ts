import { StoryStep } from "./StoryStep";
import { StoryChapter } from "./StoryChapter";
import { StoryLayer } from "./StoryLayer";
import type * as Cesium from "cesium";
import { DEFAULT_MARKER_SIZE, type StoryMarker } from "./story-marker";

export interface StoryFocusRequest {
    marker?: Cesium.Entity;
}

export interface StoryMarkerCoordinates {
    x: number;
    y: number;
    /** Defaults to "chapter" when omitted. */
    type?: "chapter" | "text" | "image";
    /** Mandatory when type is "text": the speech bubble text. Optional for "image": hover tooltip. */
    text?: string;
    openStoryStep?: boolean;
    /** Mandatory when type is "image": one or more image urls shown in gallery mode. */
    url?: string | Array<string>;
    /** Optional for "chapter": image url that replaces the default circle with story icon. */
    symbolUrl?: string;
    /** Optional for "chapter" with symbolUrl: max width/height in pixels of the symbol. Defaults to 128. */
    maxImageSize?: number;
    /** Optional icon width/height in pixels; overrides the story's markerSize. */
    markerSize?: number;
    /** When true the marker is only shown while its own step is active. */
    onlyInStep?: boolean;
}

export class Story {
    public name: string;
    public description: string;
    public storyChapters: Array<StoryChapter>;
    public width: string | undefined;
    public maxWidth: string | undefined;
    public forceCameraMode: "2D" | "3D" | undefined;
    public staticCamera: boolean | undefined;
    public requestPolygonArea: boolean | undefined;
    public statisticsApi: string | undefined;
    public markers: Array<Cesium.Entity> = [];
    public hasMarkers: boolean;
    public hasStepMarkers: boolean;
    public showMarkerToggle: boolean;
    public markerDefinitions: Array<StoryMarker>;
    /** Default icon width/height in pixels for all markers of this story. */
    public markerSize: number = DEFAULT_MARKER_SIZE;
    /** Default for steps without their own focusOnMarkers: centre the camera on the step markers. */
    public focusOnMarkers: boolean = true;
    /** Ids of story-level markers referenced by a step's showMarkers; these only show in those steps. */
    public stepBoundMarkerIds: Set<string> = new Set();
    
    constructor(name: string, 
                description: string, 
                storyChapters: Array<StoryChapter>, 
                width: string | undefined = undefined, 
                forceCameraMode: "2D" | "3D" | undefined, 
                staticCamera: boolean | undefined,
                requestPolygonArea: boolean | undefined,
                statisticsApi: string | undefined,
                hasMarkers: boolean = false,
                markerDefinitions: Array<StoryMarker> = [],
                maxWidth: string | undefined = undefined,
                showMarkerToggle: boolean = false) {
        this.name = name;
        this.description = description;
        this.storyChapters = storyChapters;
        this.width = width;
        this.maxWidth = maxWidth;
        this.forceCameraMode = forceCameraMode;
        this.staticCamera = staticCamera;
        this.requestPolygonArea = requestPolygonArea;
        this.statisticsApi = statisticsApi;
        this.hasStepMarkers = hasMarkers;
        this.showMarkerToggle = showMarkerToggle;
        this.markerDefinitions = markerDefinitions;
        this.hasMarkers = hasMarkers || markerDefinitions.length > 0;
    }

    getStoryLayers(): Array<StoryLayer> {
        let storyLayers: Array<StoryLayer> = [];

        for (let i = 0; i < this.storyChapters.length; i++) {
            let storyChapter: StoryChapter = this.storyChapters[i];

            for (let j = 0; j < storyChapter.steps.length; j++) {
                let step: StoryStep = storyChapter.steps[j];
                
                if (step.layers) {
                    for (let k = 0; k < step.layers?.length; k++) {
                        let storyLayer: StoryLayer = step.layers[k];
                        storyLayers.push(storyLayer);
                    }
                }
                
            }
        }
        return storyLayers;
    }
}