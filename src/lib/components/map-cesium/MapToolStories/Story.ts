import type { StoryStep } from "./StoryStep";
import type { StoryChapter } from "./StoryChapter";

export class Story {
    public name: string;
    public description: string;
    public storyChapters: Array<StoryChapter>;
    public width: string | undefined;
    
    constructor(name: string, description: string, storyChapters: Array<StoryChapter>, width: string | undefined = undefined) {
        this.name = name;
        this.description = description;
        this.storyChapters = storyChapters;
        this.width = width;
    }
}