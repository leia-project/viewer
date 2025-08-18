
export interface ISeriousGameToolSettings {
	backgroundLayerId: string;
	cutsceneBackgroundLayerId: string;
	levels: Array<IGameConfig>;
}

export interface IGameConfig {
	name: string;
	description: string;
	thumbnail: string;
	breachTimeDateString: string;
	breach: string;
	scenario: string;
	outline: Array<[lon: number, lat: number]>;
	outlineRoadNetwork: Array<[lon: number, lat: number]>;
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
	step: number;
	evacuationLog: Array<EvacuationLogItem>;
	lastUpdate: number;
}

export interface IRole {
	role: string, 
	svgIcon: string, 
	layerIds: Array<string>
}