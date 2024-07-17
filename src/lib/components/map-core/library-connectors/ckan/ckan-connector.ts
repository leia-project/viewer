import { LayerConfigGroup } from "../../layer-config-group";
import { LayerConfig } from "../../layer-config";
import type { LibraryConnector } from "../library-connector";
import { LibraryConnectorData } from "../library-connector-data";
import { get } from "svelte/store";
import type { CkanConnectorSettings } from "./ckan-connector-settings";


export class CkanConnector implements LibraryConnector {
    private data: LibraryConnectorData;
    private readonly debug = false;
    private readonly settings: CkanConnectorSettings;

    private readonly endpointGroups = "api/3/action/group_list";
    private readonly endpointLayers = "api/3/action/package_search";

    //orginazation list: https://docs.ckan.org/en/2.9/api/#ckan.logic.action.get.organization_list
    //group list with children: https://data.beta.geodan.nl/api/3/action/organization_list?all_fields=true&include_groups=true
    //organization info: https://docs.ckan.org/en/2.9/api/#ckan.logic.action.get.organization_show
    //organisation packages: https://data.beta.geodan.nl/api/3/action/package_search?q=organization:kadaster_&facet=false

    constructor(settings: CkanConnectorSettings = {
        url: "https://data.beta.geodan.nl",
        organizations: [],
        groups: []
    }) {
        this.settings = settings;
    }

    public async getData(): Promise<LibraryConnectorData> {
        if (!this.data) {
            try {                
                const groups = await this.getAllGroups();
                const layerConfigs = new Array<LayerConfig>();

                if (this.settings.organizations) {
                    for (let i = 0; i < this.settings.organizations.length; i++) {
                        const configs = await this.getLayerConfigs(this.settings.organizations[i], 'organization');
                        layerConfigs.push(...configs);
                    }
                }

                if (this.settings.groups) {
                    for (let i = 0; i < this.settings.groups.length; i++) {
                        let requestedLayerConfigGroup = this.getGroup(this.settings.groups[i], groups);
                        if (requestedLayerConfigGroup) {
                            let configsFromGroups = await this.recursiveGetAllUniqueLayersFromGroup(requestedLayerConfigGroup, layerConfigs, new Array<LayerConfig>());
                            if (configsFromGroups.length > 0) {
                                layerConfigs.push(...configsFromGroups);
                            }
                        }
                    }
                }

                if (this.settings.packages) {
                    for (let i = 0; i < this.settings.packages.length; i++) {
                        const configs = await this.getLayerConfigs(this.settings.packages[i], 'dataset');
                        const uniqueConfigs = this.filterDuplicates(configs, layerConfigs);
                        layerConfigs.push(...uniqueConfigs);
                       
                    }
                }

                // ToDo: filter out groups without layers

                this.data = new LibraryConnectorData(groups, layerConfigs);
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
            const request = `${this.settings.url}/${this.endpointGroups}?all_fields=true&include_extras=false&include_tags=false&include_groups=true`;
            const result = await this.get(request);

            if (result.success) {
                return this.ckanGroupsToLayerConfigGroups(result.result ?? []);
            } else {
                throw new Error("CKAN Connector: Get groups request unsuccessful")
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
    private async getLayerConfigs(name: string, type: string): Promise<Array<LayerConfig>> {
        try {
            const suffix = type === 'dataset' ? `name:${name}` : `${type}:${name}&facet=false&rows=1000`;
            const request = `${this.settings.url}/${this.endpointLayers}?q=${suffix}`;
            const result = await this.get(request);

            if (result.success) {
                return this.ckanPackagesToLayerConfigs(result);
            } else {
                console.log("CKAN Connector: Get packages request unsuccessful");
                setTimeout(() => this.getLayerConfigs(name, type), 2000); // Re-try after 2 seconds
            }
        } catch (error) {
            throw error;
        }
    }


    /**
     * Structure and convert groups returned from the CKAN API into
     * something usable.
     * @param result Flat array of group results from CKAN
     * @returns List of map-core LayerConfigGroups with the correct parent and childs
     */
    private ckanGroupsToLayerConfigGroups(result: Array<any>): Array<LayerConfigGroup> {
        const groups = new Array<LayerConfigGroup>();

        for (let i = 0; i < result.length; i++) {
            const ckanGroup = result[i];

            // handle parent groups
            if (ckanGroup.groups && ckanGroup.groups.length === 0) {
                const lg = new LayerConfigGroup(ckanGroup.name, ckanGroup.title);

                this.recursiveMergeChilds(lg, ckanGroup.name, result);
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

    /**
     * Pass a map-core LayerConfigGroup created from a CKAN group and find all child groups 
     * from CKAN returned groups.
     * @param layerGroup map-core LayerConfigGroup to find childs for
     * @param groupName CKAN groupname for the passed LayerConfigGroup, this value is also used as the id of the layerGroup
     * @param ckanGroups flat list of all groups returned from CKAN
     */
    private recursiveMergeChilds(layerGroup: LayerConfigGroup, groupName: string, ckanGroups: Array<any>): void {
        for (let i = 0; i < ckanGroups.length; i++) {
            const ckanGroup = ckanGroups[i];

            if (ckanGroup.groups && ckanGroup.groups.length > 0) {
                if (ckanGroup.groups[0].name === groupName) {
                    const lg = new LayerConfigGroup(ckanGroup.name, ckanGroup.title, layerGroup.id);
                    this.recursiveMergeChilds(lg, ckanGroup.name, ckanGroups);
                    layerGroup.addGroup(lg);
                }
            }
        }
    }

    private ckanPackagesToLayerConfigs(result: any): Array<LayerConfig> {
        const configs = new Array<LayerConfig>();

        if(!result?.result?.results) {
            return configs;
        }

        const packages = result.result.results;        

        for(let i = 0; i < packages.length; i++) {
            const pack = packages[i];
            const isExcluded = this.settings.excludePackages?.includes(pack.id) || this.settings.excludePackages?.includes(pack.name);
            if (isExcluded) continue;

            const groupID = pack.groups && pack.groups.length > 0 ? pack.groups[0].name : undefined;            
            const metadata = pack.extras;
            const attribution = pack.license;
            const description = pack.notes;
            const resources = pack.resources;
            const tags = pack.tags;

            if(resources) {
                const converted = this.ckanResourcesToLayerConfigs(resources, groupID, attribution, description, metadata, tags);                
                configs.push(...converted);
            }
        }

        if(this.debug) {
            for(let i = 0; i < configs.length; i++) {
              //  console.log(configs[i]);
            }
        }

        return configs;
    }

    private ckanResourcesToLayerConfigs(resources: Array<CKANresource>, groupID: string, attribution: string, description: string, metadata: Array<{ key: string, value: any}>, tags: Array<{display_name: string, id: string, name: string, state: string, vocabulary_id: string}>): Array<LayerConfig> {
        const configs = new Array<LayerConfig>();

        for(let i = 0; i < resources.length; i++) {
            const resource = resources[i];
            let resourceDescription = description;

            if(resource.description) {
                resourceDescription = `${resource.description}\n${resourceDescription}`;
            }

            let settings: any = {};
            let cameraPosition: any = undefined;

            if(resource.settings){
                try {
                    settings = JSON.parse(resource.settings);   
                }
                catch(Error){}
            }

            if(resource.cameraPosition) {
                try {
                    cameraPosition = JSON.parse(resource.cameraPosition);
                } catch (error) {}
            }

            if(!settings.url && resource.url) {
                settings.url = resource.url;
            }

            if (!settings.enableClipping && resource.enableClipping) {
                settings.enableClipping = resource.enableClipping;
            }

            const isBackground = this.settings.specialResources?.backgroundLayers ? this.settings.specialResources.backgroundLayers.some((l) => [resource.name, resource.id].includes(l)) : false;
            const isAddedOff = this.settings.specialResources?.layersAddedOff ? this.settings.specialResources.layersAddedOff.some((l) => [resource.name, resource.id].includes(l)) : false;
            const isAddedOn = this.settings.specialResources?.layersAddedOn ? this.settings.specialResources.layersAddedOn.some((l) => [resource.name, resource.id].includes(l)) : false;

            const lc = new LayerConfig({
                id: resource.id,
                type: resource.format.toLowerCase(),
                title: resource.name,
                description: resourceDescription,
                groupId: groupID,
                imageUrl: resource.imageUrl ? resource.imageUrl : this.getValueFromMetadata("Preview afbeelding", metadata),
                attribution: attribution,
                isBackground: isBackground,
                legendUrl: resource.legendUrl,
                defaultAddToManager: isAddedOff || isAddedOn,
                defaultOn: isAddedOn,
                metadata: metadata,
                metadataUrl: resource.metadataUrl,
                settings: settings,
                cameraPosition: cameraPosition,
                tags: tags ? tags.map((t) => t.name) : undefined
            });
            
            configs.push(lc);
        }

        return configs;
    }

    private getValueFromMetadata(key: string, metadata: Array<{ key: string, value: any}>) : string | undefined {
        const result = metadata.find(m => m.key === key);
        return result ? result.value : undefined;
    }

    /**
     * Simple fetch request to request JSON from the CKAN API
     * @param url CKAN api request uri
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


    /**
     * Get a group from the list of groups obtained with .getAllGroups() 
     * @returns LayerConfigGroup with all child groups available
     */
    private getGroup(group: string, groups: Array<LayerConfigGroup>): LayerConfigGroup {
        for (let i = 0; i < groups.length; i++) {
            if (group === groups[i].id) return groups[i];
            let childGroups = get(groups[i].childGroups);
            if (childGroups && childGroups.length > 0) {  
                let res = this.getGroup(group, childGroups);
                if (res) return res;
            }
        }
    }

    /**
     * Requests a list of layers that belong to a specific group including its child groups 
     * @returns List of LayerConfigs parsed from CKAN packages
     */
    private async recursiveGetAllUniqueLayersFromGroup(group: LayerConfigGroup, layerConfigs: Array<LayerConfig>, extraConfigs: Array<LayerConfig>): Promise<Array<LayerConfig>>  {
        let configs = await this.getLayerConfigs(group.id, 'groups');
        extraConfigs.push(...this.filterDuplicates(configs, layerConfigs));
       
        let childGroups = get(group.childGroups);
        if (childGroups && childGroups.length > 0) {
            for (let x = 0; x < childGroups.length; x++) {
                let childConfigs = await this.recursiveGetAllUniqueLayersFromGroup(childGroups[x], layerConfigs, new Array<LayerConfig>());
                extraConfigs.push(...childConfigs); 
            }
        }
        return extraConfigs;
    }

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


interface CKANresource {
    cache_last_updated: string;
    cache_url: string,
    created: string,
    description: string,
    format: string,
    id: string,
    imageUrl: string,
    last_modified: string,
    legendUrl: string,
    metadata_modified: string,
    mimetype: string,
    name: string,
    package_id: string,
    position: number,
    url: string,
    settings: string,
    cameraPosition: string,
    metadataUrl: string,
    enableClipping: boolean
}