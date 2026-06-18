export function convertGeoadminDocument(document: any): any {
    const converted: any = {};
    converted.name = getName(document);
    converted.viewer = getViewer(document);
    converted.groups = getGroups(document);
    converted.layers = getLayers(document);
    converted.tools = getTools(document);

    return converted;
}

function getName(document: any): string {
    return document.name;
}

function getViewer(document: any): any {
    const controls = document["map"]?.["controls"];

    if (!controls) {
        return undefined;
    }

    for (let i = 0; i < controls.length; i++) {
        const control = controls[i];
        let controlName = control["name"].toLowerCase();

        if (controlName.toLowerCase() === "research_map") {
            return control["options"]
        }
    }

    return undefined;
}

function getGroups(document: any): Array<any> {
    const groups = new Array<any>();
    for (let i = 0; i < document.groups.length; i++) {
        const g = document.groups[i];
        const group: any = {
            id: g.name.toString(),
            title: g.title,
            parentId: g.parentgroup.toString()
        };

        groups.push(group);
    }

    return groups;
}

// Filter out stuff from layer.source which we don't need
function filterSource(source: any): any {
    const settings: any = {};
    const filterOut = ["layerPosition", "type", "3dtiles", "basiskaart", "geojson", "modelanimation", "visible"];
    // current gm config has a config under source, merge values into settings directly
    const mergeIntoSettings = ["config"];

    if (source) {
        for (let i = 0; i < Object.keys(source).length; i++) {
            const key = Object.keys(source)[i];

            if (mergeIntoSettings.includes(key)) {
                const o = source[key];

                if (typeof o === 'object' && o !== null) {
                    for (let j = 0; j < Object.keys(o).length; j++) {
                        const oKey = Object.keys(o)[j];
                        settings[oKey] = o[oKey];
                    }
                }  

                continue;
            }

            if (filterOut.includes(key)) {
                continue;
            }

            settings[key] = source[key];
        }
    }

    return settings;
}

function sourceTypeToType(source: any): string {
    switch (source["type"]) {
        case "OGC_WMS":
            return "wms";
        case "OGC_WMTS":
            return "wmts";
        case "OGC_TMS":
            return "tms";
        case "EMPTY":
            const threedee = source["3dtiles"] ?? "false";
            const basiskaart = source["basiskaart"] ?? "false";
            const geojson = source["geojson"] ?? "false";
            const modelAnimation = source["modelanimation"] ?? "false";

            if (threedee === "true") {
                return "3dtiles";
            }

            if (basiskaart === "true") {
                return "basiskaart";
            }

            if (geojson === "true") {
                return "geojson";
            }

            if (modelAnimation === "true") {
                return "modelanimation";
            }

            return "custom";
        default:
            return "custom";
    }
}

function getLayers(document: any): Array<any> {
    const layers = new Array<any>();

    for (let i = 0; i < document.map.layers.length; i++) {
        const layer = document.map.layers[i];
        const layerConfig = {
            id: layer.id.toString(),
            type: sourceTypeToType(layer.source),
            title: layer.title,
            description: layer.options.description,
            groupId: layer.groupName.toString(),
            imageUrl: layer.options.imageUrl,
            legendUrl: layer.legendUrl,
            isBackground: layer.options.isBackground !== undefined ? layer.options.isBackground : layer.isBaseLayer !== undefined ? layer.isBaseLayer : false,
            defaultAddToManager: layer.options.visible !== undefined ? layer.options.visible : false,
            defaultOn: layer.options.showOnAdd !== undefined ? layer.options.showOnAdd : true,
            attribution: layer.options.attribution,
            metadata: layer.options.metadata,
            transparent: layer.options.transparent,
            opacity: layer.options.transparency,
            cameraPosition: layer.source.layerPosition,
            settings: filterSource(layer.source)
        };

        layers.push(layerConfig);
    }

    return layers;
}

function getTools(document: any): Array<any> {
    const tools = new Array<any>();
    const prefix = "research_";
    const map = document["map"];

    if (!map) {
        return tools;
    }

    const controls = map["controls"];

    if (!controls) {
        return tools;
    }

    for (let i = 0; i < controls.length; i++) {
        const control = controls[i];
        const active = control["active"];
        let controlName = control["name"].toLowerCase();

        if (active === false || !controlName.startsWith(prefix) || controlName === `${prefix}map`) {
            continue;
        }

        controlName = controlName.replace(prefix, "").toLowerCase();

        const tool: any = {
            "id": controlName,
            "enabled": control["active"],
            "settings": control["options"]
        };

        tools.push(tool);
    }

    return tools;
}
