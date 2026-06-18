
export class GeographicLocation {
    public lat: number;
    public lon: number;

    constructor(lon: number, lat: number) {
        this.lat = lat;
        this.lon = lon;
    }
}


export class GeographicLocation3D {
    public lat: number;
    public lon: number;
    public z: number;

    constructor(lon: number, lat: number, z: number = 0) {
        this.lat = lat;
        this.lon = lon;
        this.z = z;
    }
}