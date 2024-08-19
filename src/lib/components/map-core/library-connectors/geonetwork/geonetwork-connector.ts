import { LayerConfigGroup } from "../../layer-config-group";
import { LayerConfig } from "../../layer-config";
import type { LibraryConnector } from "../library-connector";
import { LibraryConnectorData } from "../library-connector-data";
import { get } from "svelte/store";
import type { GeoNetworkConnectorSettings } from "./geonetwork-connector-settings";


export class GeoNetworkConnector implements LibraryConnector {
    private data: LibraryConnectorData = new LibraryConnectorData();
    private readonly debug = false;
    private readonly settings: GeoNetworkConnectorSettings;

    private readonly endpointSearch = "/srv/dut/q";

    constructor(settings: GeoNetworkConnectorSettings = {
        url: "",
    }) {
        this.settings = settings;
    }

    public async getData(): Promise<LibraryConnectorData> {
        if (!(this.data.groups.length > 0 || this.data.layerConfigs.length > 0)) {
            try {  
                const groups = await this.getAllGroups();
                const layerConfigs = new Array<LayerConfig>();

                for (let i = 0; i < groups.length; i++) {
                    const configs = await this.getLayerConfigs(groups[i]);
                    layerConfigs.push(...configs);
                }

                this.data = new LibraryConnectorData(groups, layerConfigs);
                console.log(this.data);
            } catch (error) {
                throw error;
            }
        }

        return this.data;
    }

    /**
     * Request all groups from CKAN, include groups for subgroups
     * @returns List of LayerConfigGroup
     */
    private async getAllGroups(): Promise<Array<LayerConfigGroup>> {
        try {
            const request = `${this.settings.url}/srv/dut/q?_content_type=json&from=0&to=0`;
            const result = await this.get(request);

            if (result) {
                return this.geoNetworkCategoriesToLayerGroups(result.summary.topicCats);
            } else {
                throw new Error("GeoNetwork Connector: Get getAllGroups request unsuccessful")
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Request all packages and resources from CKAN
     * @param type Either 'organization', 'group' or 'dataset'
     * @returns List of LayerConfigs parsed from CKAN packages
     */
    private async getLayerConfigs(group: LayerConfigGroup): Promise<Array<LayerConfig>> {
        try {
            const suffix = `&topicCat=${group.title}&resultType=details&buildSummary=false&fast=index`;
            const request = `${this.settings.url}/${this.endpointSearch}?_content_type=json&${suffix}&from=1&to=1000`;
            const result = await this.get(request);

            if (result) {
                return this.geoNetworkLayersToLayerConfigs(result);
            } else {
                console.log("GeoNetwork Connector: Get packages request unsuccessful");
                setTimeout(() => this.getLayerConfigs(group), 2000); // Re-try after 2 seconds
            }
        } catch (error) {
            throw error;
        }
        return [];
    }


    /**
     * Structure and convert groups returned from the GeoNetwork API into
     * something usable.
     * @param result Flat array of group results from CKAN
     * @returns List of map-core LayerGroups with the correct parent and childs
     */
    private geoNetworkCategoriesToLayerGroups(result: Array<any>): Array<LayerConfigGroup> {
        const parentId = "dataportal";
        const groups = new Array<LayerConfigGroup>();

        const dataportaalGroup = new LayerConfigGroup("dataportal", "Dataportal", undefined);
        groups.push(dataportaalGroup);

        for (let i = 0; i < result.length; i++) {
            const group = result[i];

            // handle parent groups
            if (group['@count'] > 0) {
                const lg = new LayerConfigGroup(group['@name'], group['@name'], parentId);
                groups.push(lg);
            }
        }

        if (this.debug) {
            for (let i = 0; i < groups.length; i++) {
                console.log(this.debugGroups(groups[i]));
            }
        }

        return groups;
    }

    private geoNetworkLayersToLayerConfigs(result: any): Array<LayerConfig> {
        const configs = new Array<LayerConfig>();

        if(!result?.metadata) {
            return configs;
        }

        const layers = result.metadata;


        for(let i = 0; i < layers.length; i++) {
            const l = layers[i];
            
            

            const lc = new LayerConfig({
                id: l.identifier,
                type: "wms",
                title: l.title,
                description: l.abstract,
                groupId: l.topicCat,
                imageUrl: this.getImageUrl(l.image),
                attribution: undefined,
                isBackground: false,
                legendUrl: undefined,
                defaultAddToManager: false,
                defaultOn: false,
                metadata: undefined,
                metadataUrl: '',
                settings: this.getSettings(l.link),
                cameraPosition: undefined,
                tags: undefined
            });                
            configs.push(lc);
        }

        if(this.debug) {
            for(let i = 0; i < configs.length; i++) {
               console.log(configs[i]);
            }
        }

        return configs;
    }

    private getValueFromMetadata(key: string, metadata: Array<{ key: string, value: any}>) : string | undefined {
        const result = metadata.find(m => m.key === key);
        return result ? result.value : undefined;
    }

    private getImageUrl(image: any): string {
        // get imageUrl
        let imageUrl;
        if(image instanceof Array) {
            for (let i = 0; i < image.length; i++) {
                imageUrl = image[i].startsWith('thumbnail') ? image[i] : undefined
            }
        } else {
            imageUrl = image
        }
        return imageUrl ? imageUrl.split('|')[1] : undefined
    }

    private getSettings(link: Array<string>): Object {
        for (let i = 0; i < link.length; i++) {
            let l = link[i];
            if (l.includes('OGC:WMS')) {
                let l_split = l.split('|');
                return {
                    url: l_split[2].split('?')[0],
                    type: 'wms',
                    featureName: l_split[0],
                    contenttype: 'image/png'
                }
            }
        }
        return {}
    }

    /**
     * Simple fetch request to request JSON from the GeoNetwork API
     * @param url  api request uri
     * @returns parsed json response from CKAN
     */
    private async get(url: string): Promise<any> {
        const response = await fetch(url);
        return await response.json();
    }

    /** Create debug line to show group structure */
    private debugGroups(group: LayerConfigGroup, depth = 0, logString: string = ""): string {
        logString += `\n${"   ".repeat(depth)}${group.title}`
        const childs = get(group.childGroups);
        for (let i = 0; i < childs.length; i++) {
            logString = this.debugGroups(childs[i], depth + 1, logString);
        }

        return logString;
    }


    // /**
    //  * Get a group from the list of groups obtained with .getAllGroups() 
    //  * @returns LayerGroup with all child groups available
    //  */
    // private getGroup(group: string, groups: Array<LayerConfigGroup>): LayerConfigGroup {
    //     for (let i = 0; i < groups.length; i++) {
    //         if (group === groups[i].id) return groups[i];
    //         let childGroups = get(groups[i].childGroups);
    //         if (childGroups && childGroups.length > 0) {  
    //             let res = this.getGroup(group, childGroups);
    //             if (res) return res;
    //         }
    //     }
    // }

    // /**
    //  * Requests a list of layers that belong to a specific group including its child groups 
    //  * @returns List of LayerConfigs parsed from CKAN packages
    //  */
    // private async recursiveGetAllUniqueLayersFromGroup(group: LayerConfigGroup, layerConfigs: Array<LayerConfig>, extraConfigs: Array<LayerConfig>): Promise<Array<LayerConfig>>  {
    //     let configs = await this.getLayerConfigs(group.id, 'groups');
    //     extraConfigs.push(...this.filterDuplicates(configs, layerConfigs));
       
    //     let childGroups = get(group.childGroups);
    //     if (childGroups && childGroups.length > 0) {
    //         for (let x = 0; x < childGroups.length; x++) {
    //             let childConfigs = await this.recursiveGetAllUniqueLayersFromGroup(childGroups[x], layerConfigs, new Array<LayerConfig>());
    //             extraConfigs.push(...childConfigs); 
    //         }
    //     }
    //     return extraConfigs;
    // }

    /**
     * Filter out duplicate layers from a list of layers compared to a list of existing layers
     * @returns List of unique LayerConfigs without duplicates compared to the existing list
     */
    private filterDuplicates(newConfigs: Array<LayerConfig>, layerConfigs: Array<LayerConfig>): Array<LayerConfig> {
        const filtered = new Array<LayerConfig>();
        const existing = layerConfigs.map((l) => l.id);
        for (let i = 0; i < newConfigs.length; i++) {
            if (!existing.includes(newConfigs[i].id)) {
                filtered.push(newConfigs[i]);
            }
        }
        return filtered;
    }

}