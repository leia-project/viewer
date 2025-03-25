// @ts-ignore
import Wkt from "wicket";

export function wktToFeatureCollection(wktString: string, name: string | undefined = undefined): any {
	const wkt = new Wkt.Wkt();
	wkt.read(wktString);
	const json = wkt.toJson();

	const fc = {
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				geometry: json,
				properties: {}
			}
		]
	};

	if (name) {
		fc.features[0].properties = {
			name: name
		};
	}

	return fc;
}
