<script lang="ts">
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
    import Folder from "carbon-icons-svelte/lib/Folder.svelte";

    import type { MapCore } from "$lib/components/map-core/map-core";
    import { CkanConnector } from "$lib/components/map-core/library-connectors/ckan/ckan-connector";
    import type { LibraryConnector } from "$lib/components/map-core/library-connectors/library-connector";
    import { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";
    import { LayerConfig } from "$lib/components/map-core/layer-config";
    import type { LayerLibrary } from "$lib/components/map-core/layer-library";


    import MapToolLibraryView from "./MapToolLayerLibraryView.svelte";
    import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";


    const { registerTool, getMapContainer, map } = getContext<any>("mapTools");
    const localStorageLocation = "library.customLayers";

    let id: string = "layerlibrary";
    export let icon: any = Folder;
    export let label: string = get(_)("tools.layerLibrary.label");
    export let txtTitle = get(_)("tools.layerLibrary.label");
    export let txtClose = get(_)("tools.layerLibrary.close");

    let view: MapToolLibraryView | undefined = undefined;
    let tool = new MapToolMenuOption(id, icon, label, false, undefined, true, false);
    let useTags: Boolean;
    let library: LayerLibrary = map ? map.layerLibrary : undefined;
    $: {
        tool.label.set(label);
    }

    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showInfo();
    };

    registerTool(tool);

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
                txtTitle: txtTitle,
                txtClose: txtClose,
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
