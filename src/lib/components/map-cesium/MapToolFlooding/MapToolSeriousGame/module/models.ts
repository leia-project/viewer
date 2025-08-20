import type { CameraLocation } from "$lib/components/map-core/camera-location";

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
	timeSteps: Array<number>;
	homeView: CameraLocation;
	floodView: CameraLocation;
	outline: Array<[lon: number, lat: number]>;
	outlineRoadNetwork: Array<[lon: number, lat: number]>;
	extractionPointIds: Array<string>;
}

export interface EvacuationLogItem {
	hexagonId: string;
	extractionPointId: string;
	evacuated: number;
	timeStep: number,
	added: boolean;
}

export interface ISavedGame {
	uuid: string;
	name: string;
	elapsedTime: number;
	evacuationLog: Array<EvacuationLogItem>;
	lastUpdate: number;
}

export interface IRole {
	role: string, 
	svgIcon: string, 
	layerIds: Array<string>
}