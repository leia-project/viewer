import type { ComposedRow } from "./ComposedRow.js";

export class ComposedFeatureInfoResult {
    public label: string;
    public rows: Array<ComposedRow>;

    constructor(label: string, rows: Array<ComposedRow> = new Array<ComposedRow>()) {
        this.label = label;
        this.rows = rows;
    }
}
