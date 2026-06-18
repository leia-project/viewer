import { Location } from "./location";

export class CameraLocation extends Location {
    public title: string | undefined;
    public description: string | undefined;
    public heading: number;
    public pitch: number;
    public duration: number;
    public editable: boolean;

    constructor(x: number, y: number, z: number, heading: number = 0, pitch: number = 0, duration: number = 0, title: string | undefined = undefined, description: string | undefined = undefined, editable: boolean = true) {
        super(x, y, z);
        this.heading = heading;
        this.pitch = pitch;
        this.duration = duration;
        this.title = title;
        this.description = description;
        this.editable = editable;
    }
}