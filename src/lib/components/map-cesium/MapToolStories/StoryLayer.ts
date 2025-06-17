
export class StoryLayer {
    public id: string;
    public style: any;
    public opacity: number;
    public url: string | undefined;
    public featureName: string | undefined;

    constructor(id: string, opacity: number = 1.0, style: any = undefined, url: string | undefined, featureName: string | undefined) {
        this.id = id;
        this.opacity = opacity;
        this.style = style;
        this.url = url; // URL for wcs request, NOT for fetching the WMS layer
        this.featureName = featureName;
    }
}