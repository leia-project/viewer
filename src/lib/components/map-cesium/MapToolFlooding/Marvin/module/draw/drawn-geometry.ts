// @ts-ignore
import Wkt from 'wicket';

export class DrawnGeometry {
	public id: string;
	public geoJSON: any;

	constructor(id: string, geoJSON: any) {
		this.id = id;
		this.geoJSON = geoJSON;
	}

	public updateGeoJSON(geoJSON: any): void {
		this.geoJSON = geoJSON;
	}

	public getWkt(): string {
		const wkt = new Wkt.Wkt();
		const wktObj = wkt.read(JSON.stringify(this.geoJSON));
		return wktObj.write();
	}
}
