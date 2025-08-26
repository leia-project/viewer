import type { CameraLocation } from "../external-dependencies";
import type { RouteSegment } from "./game-elements/roads/route-segments";


export interface ISeriousGameToolSettings {
	backgroundLayerId: string;
	generalLayerIds: Array<string>;
	cutsceneBackgroundLayerId: string;
	levels: Array<IGameConfig>;
}

export interface IGameConfig {
	name: string;
	description: string;
	scenarioDescription: string;
	breachNotification: string;
	thumbnail: string;
	breachTimeDateString: string;
	breach: string;
	scenario: string;
	personsPerCar: number;
	preparationPhase: boolean;
	timesteps: Array<number>;
	homeView: CameraLocation;
	floodView: CameraLocation;
	outline: Array<[lon: number, lat: number]>;
	outlineRoadNetwork: Array<[lon: number, lat: number]>;
	extractionPointIds: Array<string>;
}

export interface EvacuationLogItem {
	routeSegmentIds: Array<string>,
	hexagonId: string,
	extractionPointId: string,
	numberOfPersons: number
	numberOfCars: number;
	time: number;
}

export interface MeasureLogItem {
	id: string;
	applied: boolean;
}

export interface ISavedGame {
	uuid: string;
	name: string;
	level: string;
	elapsedTime: number;
	evacuations: Array<EvacuationLogItem>;
	measures: Array<MeasureLogItem>;
	lastUpdate: number;
}

export interface IRole {
	role: string, 
	svgIcon: string, 
	layerIds: Array<string>
}

export interface RouteResult {
	route: Array<RouteSegment>;
	extractionPoint: RouteSegment;
	evacuatedCars: number;
	numberOfPersons: number;
}