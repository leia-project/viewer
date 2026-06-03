import type { StoryStep } from "./StoryStep";

export class StoryChapter {
    public id: string;
    public title: string;
    public buttonText: string;
    public steps: Array<StoryStep>;
    
    constructor(id: string, title: string, buttonText: string, steps: Array<StoryStep>) {
        this.id = id;
        this.title = title;
        this.buttonText = buttonText;
        this.steps = steps;
    }
}