import { Location } from "./location.js";

export class CameraLocation extends Location {
    public title: string;
    public description: string;
    public heading: number;
    public pitch: number;
    public duration: number;
    public editable: boolean;

    constructor(x: number, y: number, z: number, heading: number = 0, pitch: number = 0, duration: number = 0, title: string = undefined, description: string = undefined, editable: boolean = true) {
        super(x, y, z);
        this.heading = heading;
        this.pitch = pitch;
        this.duration = duration;
        this.title = title;
        this.description = description;
        this.editable = editable;
    }
}