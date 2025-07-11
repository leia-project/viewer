import { StoryStep } from "./StoryStep";
import { StoryChapter } from "./StoryChapter";
import { StoryLayer } from "./StoryLayer";

export class Story {
    public name: string;
    public description: string;
    public storyChapters: Array<StoryChapter>;
    public width: string | undefined;
    public disableModeSwitcher: boolean | undefined;
    
    constructor(name: string, description: string, storyChapters: Array<StoryChapter>, width: string | undefined = undefined, disableModeSwitcher: boolean | undefined) {
        this.name = name;
        this.description = description;
        this.storyChapters = storyChapters;
        this.width = width;
        this.disableModeSwitcher = disableModeSwitcher;
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