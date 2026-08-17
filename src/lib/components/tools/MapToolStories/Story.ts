import { StoryStep } from "./StoryStep";
import { StoryChapter } from "./StoryChapter";
import { StoryLayer } from "./StoryLayer";
import type * as Cesium from "cesium";

export interface StoryMarkerCoordinates {
    x: number;
    y: number;
}

export class Story {
    public name: string;
    public description: string;
    public storyChapters: Array<StoryChapter>;
    public width: string | undefined;
    public forceCameraMode: "2D" | "3D" | undefined;
    public staticCamera: boolean | undefined;
    public requestPolygonArea: boolean | undefined;
    public statisticsApi: string | undefined;
    public markerCoordinates: StoryMarkerCoordinates | undefined;
    public marker: Cesium.Entity | undefined;
    
    constructor(name: string, 
                description: string, 
                storyChapters: Array<StoryChapter>, 
                width: string | undefined = undefined, 
                forceCameraMode: "2D" | "3D" | undefined, 
                staticCamera: boolean | undefined,
                requestPolygonArea: boolean | undefined,
                statisticsApi: string | undefined,
                markerCoordinates: StoryMarkerCoordinates | undefined = undefined) {
        this.name = name;
        this.description = description;
        this.storyChapters = storyChapters;
        this.width = width;
        this.forceCameraMode = forceCameraMode;
        this.staticCamera = staticCamera;
        this.requestPolygonArea = requestPolygonArea;
        this.statisticsApi = statisticsApi;
        this.markerCoordinates = markerCoordinates;
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