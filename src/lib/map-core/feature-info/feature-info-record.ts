
export class FeatureInfoRecord {
    public title: string;    
    public value: any;
    public type: string;
    public typeSettings: any;

    constructor(title: string, value: any, type = "text", typeSettings: any = undefined) {
        this.title = title;
        this.value = value;
        this.type = type;
        this.typeSettings = typeSettings;
    }
}