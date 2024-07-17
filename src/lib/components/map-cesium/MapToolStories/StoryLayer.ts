
export class StoryLayer {
    public id: string;
    public style!: any;
    public opacity!: number;

    constructor(id: string, opacity: number = 1.0, style: any = undefined) {
        this.id = id;
        this.opacity = opacity;
        this.style = style;
    }
}