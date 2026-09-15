
export class StoryLayer {
    public id: string;
    public style: any;
    public opacity: number;
    public url: string | undefined;
    public featureName: string | undefined;
    public showOpacitySlider: boolean;

    constructor(id: string, opacity: number, style: any = undefined, url: string | undefined, featureName: string | undefined, showOpacitySlider: boolean = true) {
        this.id = id;
        this.opacity = opacity;
        this.style = style;
        this.url = url; // URL for WCS request, NOT for fetching the WMS layer
        this.featureName = featureName;
        this.showOpacitySlider = showOpacitySlider;
    }
}