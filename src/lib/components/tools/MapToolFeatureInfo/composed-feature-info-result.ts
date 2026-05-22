import type { ComposedRow } from "./composed-row";

export class ComposedFeatureInfoResult {
    public label: string;
    public rows: Array<ComposedRow>;

    constructor(label: string, rows: Array<ComposedRow> = new Array<ComposedRow>()) {
        this.label = label;
        this.rows = rows;
    }
}
