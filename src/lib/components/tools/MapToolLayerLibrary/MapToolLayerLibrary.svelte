<script lang="ts">
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
	import { Folder } from "carbon-icons-svelte";

    import type { MapCore } from "$lib/map-core/map-core";
    import { CkanConnector } from "$lib/map-core/library-connectors/ckan/ckan-connector";
    import { GeoNetworkConnector } from "$lib/map-core/library-connectors/geonetwork/geonetwork-connector";
    import type { LibraryConnector } from "$lib/map-core/library-connectors/library-connector";
    import { LayerConfigGroup } from "$lib/map-core/layer-config-group";
    import { LayerConfig } from "$lib/map-core/layer-config";
    import type { LayerLibrary } from "$lib/map-core/layer-library";

    import MapToolLibraryView from "./MapToolLayerLibraryView.svelte";
    import { MapToolMenuOption } from "../MapToolMenuOption";

    const { registerTool, getMapContainer, map } = getContext<any>("mapTools");
    const localStorageLocation = "library.customLayers";

    export let id: string;
    export let label: string; 
    export let icon: any = Folder;

    let view: MapToolLibraryView | undefined = undefined;

    const tool = new MapToolMenuOption(id, icon, label, false, undefined, true, false);
    registerTool(tool);

    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showInfo();
    };

    const library: LayerLibrary = map ? map.layerLibrary : undefined;
    let useTags: Boolean;

    tool.settings.subscribe((settings) => {
        if (settings) {
            if (settings.connectors) {
                getConnectorData(settings.connectors);
            }
            if (settings.useTags && settings.useTags === true ) {
                useTags = true;
            }
        }
    });

    //Add myData group to library
    if (map) {
        library.addLayerConfigGroup(new LayerConfigGroup("myData", "My data"));
        getLayersFromLocalStorage();
    }

    function getLayersFromLocalStorage(): void {
        try {
            const localStorageLayers = localStorage.getItem(localStorageLocation);
            if (localStorageLayers && localStorageLayers !== "undefined") {
                const layers = JSON.parse(localStorageLayers);
                for (let i = 0; i < layers.length; i++) {
                    const config = new LayerConfig({
                        id: String(Math.floor(Math.random() * 1000)),
                        title: layers[i].title,
                        type: layers[i].type,
                        settings: layers[i].settings,
                        groupId: "myData",
                        defaultOn: true
                    });
                    library.addLayerConfig(config);
                    config.added.set(layers[i].layerAdded)
                }
            } 
        } catch(e) {
            console.log(e);
            localStorage.removeItem(localStorageLocation);  // Reset if error occurs
        }
    }

    function updateLocalStorage(): void {
        const allCustomLayers = library.findGroup("myData")?.layerConfigs;
        if (!allCustomLayers) return;
        const store = new Array();
        for (const layer of get(allCustomLayers)) {
            const obj = {
                title: layer.title,
                type: layer.type,
                settings: layer.settings,
                layerAdded: get(layer.added)
            }
            store.push(obj);
        }
        localStorage.setItem(localStorageLocation, JSON.stringify(store));
    }


    async function getConnectorData(connectors: any): Promise<void> {
        if(!(connectors instanceof Array)) {
            return;
        }

        for(let i = 0; i < connectors.length; i++) {
            const settings = connectors[i];
            let connector: LibraryConnector | undefined = undefined;

            if(settings.type && settings.type === "ckan") {
                connector = new CkanConnector(settings);
            } else if (settings.type && settings.type === "geonetwork"){
                connector = new GeoNetworkConnector(settings);
            }

            if(!connector) continue;

            const data = await connector.getData();
            const mapCore = map as MapCore;
            mapCore.layerLibrary.addLayerConfigGroups(data.groups);
            mapCore.layerLibrary.addLayerConfigs(data.layerConfigs);
            mapCore.dispatch("Connector fetched", {connector});
        }
    }

    function showInfo(): void {
        const container = getMapContainer();

        if (view) {
            view.$destroy();
        }

        view = new MapToolLibraryView({
            target: container,
            props: {
                txtTitle: $_(label),
                txtClose: $_("tools.layerLibrary.close"),
                library: library,
                useTags: useTags
            }
        });

        view.$on("remove", () => {
            // @ts-ignore
            view.$destroy();
            view = undefined;
        });

        view.$on("updateLocalStorage", updateLocalStorage)
    }
</script>
