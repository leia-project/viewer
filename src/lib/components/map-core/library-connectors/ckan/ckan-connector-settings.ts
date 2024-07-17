export type CkanConnectorSettings = {
    url: string;
    organizations?: Array<string>;  
    groups?: Array<string>;
    packages?: Array<string>;
    excludePackages?: Array<string>;
    specialResources?: {
        backgroundLayers?: Array<string>;
        layersAddedOn?: Array<string>;
        layersAddedOff?: Array<string>;
    }
}