
export class FeatureInfoRequestOptions {
    /** Layers to request leave empty for all */
    public layerIds?: Array<string>;

    /** location to query */
    public location: number[] = undefined

    /**
     * Construct FeatureInfoRequestOptions
     * @param x X coordinate 
     * @param y Y coordinate
     * @param layerIds Layers to request, leave emptry for all
     */
    constructor(x: number, y: number, layerIds: Array<string> = undefined) {
        this.location = [x, y];
        this.layerIds = layerIds;
    }
}