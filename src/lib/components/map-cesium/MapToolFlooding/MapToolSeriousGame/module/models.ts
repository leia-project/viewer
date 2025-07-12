import type { Breach } from "../../layer-controller";

export interface IGameSettings {
    backgroundLayerId: string;
}

export interface IGameConfig {
    name: string;
    description: string;
    thumbnail: string;
    breachTimeDateString: string;
    breach: Breach;
    scenario: string;
    outline: Array<[lon: number, lat: number]>;
    outlineRoadNetwork: Array<[lon: number, lat: number]>;
}

export interface IRole {
    role: string, 
    image: string, 
    layerIds: Array<string>
}