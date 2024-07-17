import type { StoryStep } from "./StoryStep";

export class Story {
    public name: string;
    public description: string;
    public steps: Array<StoryStep>;
    public width: string | undefined;
    
    constructor(name: string, description: string, steps: Array<StoryStep>, width: string | undefined = undefined) {
        this.name = name;
        this.description = description;
        this.steps = steps;
        this.width = width;
    }
}