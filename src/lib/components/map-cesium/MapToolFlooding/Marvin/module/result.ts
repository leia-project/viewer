// @ts-ignore
import Wkt from "wicket";
import { bbox } from "@turf/bbox";

interface ResultResponse {
	data?: Record<string, any>[];
	summary?: string;
	error?: string;
	datasetName?: string;
	focus?: any;
	debug?: Partial<DebugInfo>;
	executionTime?: number;
}

// A class for individual feature
class Feature {
	[key: string]: any; // You can customize this for specific key-value pairs

	constructor(properties: Record<string, any> = {}) {
		Object.assign(this, properties); // Assign properties to this instance
	}
}

export class Features {
	private features: Feature[];

	constructor(features: Record<string, any>[] = []) {
		this.features = features.map((f) => new Feature(f));
	}

	add(feature: Record<string, any>): void {
		this.features.push(new Feature(feature));
	}

	get(): Feature[] {
		return this.features;
	}

	find(key: string, value: any): Feature | undefined {
		return this.features.find((feature) => feature[key] === value);
	}

	length(): number {
		return this.features.length;
	}

	hasGeometry(): boolean {
		return this.features.some((feature) => "geom" in feature || "geometry" in feature);
	}

	getFeatureCollection(): any {
		if (!this.hasGeometry()) {
			return undefined;
		}

		const wkt = new Wkt.Wkt();
		const features = [];

		for (const feature of this.features) {
			if (!feature.geom && !feature.geometry) {
				continue;
			}

			const geometry = wkt.read(feature.geom || feature.geometry);
			if (!geometry) {
				continue;
			}

			const f: any = {
				type: "Feature",
				geometry: geometry.toJson(),
				properties: {}
			};

			for (const key in feature) {
				if (key === "geom" || key === "geometry") {
					continue;
				}

				f.properties[key] = feature[key];
			}

			// if name is not found check if it has value field and user value as name
			if (!f.properties["name"] && f.properties["value"]) {
				f.properties["name"] = f.properties["value"];
			}

			features.push(f);
		}

		return {
			type: "FeatureCollection",
			features: features
		};
	}
}

export class Result {
	features?: Features;
	summary?: string;
	datasetName?: string;
	error?: string;
	inputLocation?: InputLocation;
	executionTime?: number;
	debug?: DebugInfo;
	hasGeometry: boolean;

	constructor(response: Partial<ResultResponse> = {}) {
		this.features = response.data ? new Features(response.data) : undefined;
		this.summary = response.summary;
		this.error = response.error;
		this.datasetName = response.datasetName;
		this.inputLocation = response.focus ? new InputLocation(response.focus) : undefined;
		this.executionTime = response.executionTime;
		this.debug = response.debug ? new DebugInfo(response.debug) : undefined;
		this.hasGeometry = this.features ? this.features.hasGeometry() : false;
	}

	static fromJSON(json: any): Result {
		return new Result({
			data: json.data,
			summary: json.summary,
			error: json.error,
			datasetName: json.datasetName,
			focus: json.focus,
			executionTime: json.executionTime,
			debug: json.debug
		});
	}
}

class DebugInfo {
	ddl?: string[];
	documentation?: string[];
	sqlPrompt?: string;
	sql?: string;
	similarQuestions?: string[];
	logs?: string[];
	geometry?: any;

	constructor(debug: Partial<DebugInfo> = {}) {
		this.ddl = debug.ddl;
		this.documentation = debug.documentation;
		this.sqlPrompt = debug.sqlPrompt;
		this.sql = debug.sql;
		this.similarQuestions = debug.similarQuestions;
		this.logs = debug.logs;
		this.geometry = debug.geometry;
	}

	getLogs(): string {
		let log = "";
		if (this.logs) {
			for (let i = 0; i < this.logs.length; i++) {
				const entry: any = this.logs[i];
				log += `${entry.timestamp} [${entry.loglevel}] ${entry.pipeline} - ${entry.message}\n`;
			}
		}

		return log;
	}
}

class Location {
	name?: string;
	geometry?: any;

	constructor(location: Partial<Location> = {}) {
		this.name = location.name;
		this.geometry = location.geometry;
	}
}

class InputLocation {
	tag?: string;
	source?: string[];
	locations?: Location[];

	constructor(inputLocations: Partial<InputLocation> = {}) {
		this.tag = inputLocations.tag;
		this.source = inputLocations.source;
		this.locations = inputLocations.locations ? inputLocations.locations.map((location) => new Location(location)) : undefined;
	}

	public getFeatureCollection(): any {
		const wkt = new Wkt.Wkt();
		const features = [];

		if (this.locations) {
			for (const location of this.locations) {
				if (!location.geometry) {
					continue;
				}

				const geometry = wkt.read(location.geometry);
				if (!geometry) {
					continue;
				}

				const feature: any = {
					type: "Feature",
					geometry: geometry.toJson(),
					properties: {}
				};

				feature.properties["name"] = location.name;
				features.push(feature);
			}
		}

		return {
			type: "FeatureCollection",
			features: features
		};
	}

	public getBounds(): number[] {
		const fc = this.getFeatureCollection();
		const box = bbox(fc);

		return [box[0], box[1], box[2], box[3]];
	}
}
