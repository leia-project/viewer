import type { Breach } from "../layer-controller";


export interface IGameConfig {
    name: string;
    description: string;
    thumbnail: string;
    breach: Breach;
    scenario: string;
}