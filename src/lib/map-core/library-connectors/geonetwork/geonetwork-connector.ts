import { LayerConfigGroup } from "../../layer-config-group";
import { LayerConfig } from "../../layer-config";
import type { LibraryConnector } from "../library-connector";
import { LibraryConnectorData } from "../library-connector-data";
import { get } from "svelte/store";
import type { GeoNetworkConnectorSettings } from "./geonetwork-connector-settings";
import { fetchCapabilitiesLayers } from "$lib/components/tools/MapToolLayerLibrary/CustomLayers/capabilities";


export class GeoNetworkConnector implements LibraryConnector {
    public readonly label = "GeoNetwork";
    private data: LibraryConnectorData = new LibraryConnectorData();
    private readonly debug = false;
    private readonly settings: GeoNetworkConnectorSettings;
    private readonly endpointSearch = "/srv/dut/q";
    private readonly linkFormat = "/srv/dut/catalog.search#/metadata/{uuid}?tab=general";

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
                const recordGroups = new Array<LayerConfigGroup>();

                for (let i = 0; i < groups.length; i++) {
                    if (groups[i].id === "dataportal") continue;  // skip fake parent
                    const { configs, subgroups } = await this.getLayerConfigs(groups[i]);
                    layerConfigs.push(...configs);
                    recordGroups.push(...subgroups);
                }

                this.data = new LibraryConnectorData([...groups, ...recordGroups], layerConfigs);
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
     * @returns The parsed LayerConfigs and any per-record subgroups
     */
    private async getLayerConfigs(group: LayerConfigGroup): Promise<{ configs: Array<LayerConfig>, subgroups: Array<LayerConfigGroup> }> {
        const allConfigs = new Array<LayerConfig>();
        const allSubgroups = new Array<LayerConfigGroup>();
        const pageSize = 100;
        const maxPages = 1000; // safety guard against an API that ignores paging
        let from = 1;

        try {
            for (let page = 0; page < maxPages; page++) {
                const to = from + pageSize - 1;
                const suffix = `&topicCat=${group.id}&resultType=details&buildSummary=false&fast=index`;
                const request = `${this.settings.url}/${this.endpointSearch}?_content_type=json&${suffix}&from=${from}&to=${to}`;
                const result = await this.get(request);

                if (!result?.metadata) break;

                const { configs, subgroups } = await this.geoNetworkLayersToLayerConfigs(result, group.id);
                allConfigs.push(...configs);
                allSubgroups.push(...subgroups);

                const returned = Array.isArray(result.metadata) ? result.metadata.length : 1;
                if (returned < pageSize) break;

                from += pageSize;
            }
        } catch (error) {
            throw error;
        }

        return { configs: allConfigs, subgroups: allSubgroups };
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

        const dataportalGroup = new LayerConfigGroup("dataportal", "Dataportal", undefined);
        dataportalGroup.connector = {
            type: this.label,
            url: this.settings.url 
        }
        groups.push(dataportalGroup);

        for (let i = 0; i < result.length; i++) {
            const group = result[i];

            // handle parent groups
            if (group['@count'] > 0) {
                const lg = new LayerConfigGroup(group['@name'], group['@label'], parentId);
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

    private async geoNetworkLayersToLayerConfigs(result: any, groupId: string): Promise<{ configs: Array<LayerConfig>, subgroups: Array<LayerConfigGroup> }> {
        const configs = new Array<LayerConfig>();
        const subgroups = new Array<LayerConfigGroup>();

        if(!result?.metadata) {
            return { configs, subgroups };
        }

        const layers = Array.isArray(result.metadata) ? result.metadata : [result.metadata];

        // Resolve settings per record first, so WMS capabilities can be fetched
        // once per unique endpoint (cached) instead of once per layer.
        const parsed: Array<{ l: any; settingsList: Array<any> }> = layers
            .map((l: any) => ({ l, settingsList: this.getSettings(l.link) }))
            .filter((entry: { l: any; settingsList: Array<any> }) => entry.settingsList.length > 0);

        const urls: Array<string> = [];
        for (const entry of parsed) {
            for (const s of entry.settingsList) urls.push(s.url);
        }
        const titleMap = await this.getWmsTitleMap(urls);

        for (const { l, settingsList } of parsed) {
            const multipleLayers = settingsList.length > 1;

            // Records exposing multiple WMS layers are nested under a subgroup named
            // after the record, so the near-identical child layers are easier to tell apart.
            const childGroupId = multipleLayers ? l.identifier : groupId;
            if (multipleLayers) {
                subgroups.push(new LayerConfigGroup(l.identifier, l.title, groupId));
            }

            for (let j = 0; j < settingsList.length; j++) {
                const layerSettings = settingsList[j];
                const wmsTitle = titleMap.get(`${layerSettings.url}::${layerSettings.featureName}`) ?? layerSettings.featureName;
                const lc = new LayerConfig({
                    id: multipleLayers ? `${l.identifier}__${layerSettings.featureName}` : l.identifier,
                    type: "wms",
                    title: multipleLayers ? wmsTitle : l.title,
                    description: l.abstract,
                    groupId: childGroupId,
                    imageUrl: this.getImageUrl(l.image),
                    attribution: l.lineage,
                    isBackground: false,
                    legendUrl: undefined,
                    defaultAddToManager: false,
                    defaultOn: false,
                    metadata: undefined,
                    metadataUrl: '',
                    metadataLink: this.settings.url + this.linkFormat.replace('{uuid}', l['geonet:info'].uuid),
                    dateCreated: l.publicationDate ?? l.creationDate ?? "",
                    dateRevision: l.revisionDate ?? "",
                    settings: layerSettings,
                    cameraPosition: undefined,
                    tags: undefined
                });
                configs.push(lc);
            }
        }

        if(this.debug) {
            for(let i = 0; i < configs.length; i++) {
               console.log(configs[i]);
            }
        }

        return { configs, subgroups };
    }

    /**
     * Fetches WMS GetCapabilities once per unique endpoint (deduplicated and cached by
     * the capabilities helper) and builds a lookup of `${url}::${featureName}` to the
     * human-readable layer title. Endpoints are fetched in parallel.
     */
    private async getWmsTitleMap(urls: Array<string>): Promise<Map<string, string>> {
        const titleMap = new Map<string, string>();
        const uniqueUrls = Array.from(new Set(urls));
        await Promise.all(uniqueUrls.map(async (url) => {
            try {
                const capabilitiesLayers = await fetchCapabilitiesLayers(url, "wms");
                for (const layer of capabilitiesLayers) {
                    titleMap.set(`${url}::${layer.id}`, layer.text);
                }
            } catch (error) {
                console.error(error);
            }
        }));
        return titleMap;
    }

    private getValueFromMetadata(key: string, metadata: Array<{ key: string, value: any}>) : string | undefined {
        const result = metadata.find(m => m.key === key);
        return result ? result.value : undefined;
    }

    private getImageUrl(image: any): string | undefined {
        let imageUrl: string | undefined = undefined;
        if (image instanceof Array) {
            for (let i = 0; i < image.length; i++) {
                imageUrl = image[i].startsWith('thumbnail') ? image[i] : undefined
            }
        } else {
            imageUrl = image
        }
        return imageUrl?.split('|')[1];
    }

    private getSettings(link: Array<string> | undefined): Array<any> {
        const wmslinks: Array<any> = [];
        try {
            if (!link) {
                return wmslinks;
            }
            const links = Array.isArray(link) ? link : [link];
            for (let i = 0; i < links.length; i++) {
                let l = links[i];
                if (l.includes('OGC:WMS')) {
                    let l_split = l.split('|');
                    wmslinks.push({
                        url: l_split[2].split('?')[0],
                        type: 'wms',
                        featureName: l_split[0],
                        contenttype: 'image/png'
                    });
                }
            }
        } catch (error) {
            console.error(error);
        }
        return wmslinks;
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