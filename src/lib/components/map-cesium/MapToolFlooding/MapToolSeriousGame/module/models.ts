import type { Breach } from "../../layer-controller";

export interface IGameSettings {
    backgroundLayerId: string;
}

export interface IGameConfig {
    name: string;
    description: string;
    thumbnail: string;
    breach: Breach;
    scenario: string;
}

export interface IRole {
    role: string, 
    image: string, 
    layerIds: Array<string>
}