<script lang="ts">
    import { getContext } from "svelte";
    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";
    import Information from "carbon-icons-svelte/lib/Information.svelte";
    import FeatureInfoView from "./FeatureInfoView.svelte";

    import type { MouseLocation } from "$lib/components/map-core/mouse-location";
    import { FeatureInfoRequestOptions } from "$lib/components/map-core/FeatureInfo/feature-info-request-options";

    const { registerTool, map, getMapContainer } = getContext<any>("mapTools");

    let id: string = "featureinfo";
    export let icon: any = Information;
    export let label: string = "Feature Info";
    export const textNoData: string = "No Data, Click on the map to request Feature Info";

    let featureInfoView: FeatureInfoView | undefined = undefined;
    let tool = new MapToolMenuOption(id, icon, label, false, undefined, false);
    $: { tool.label.set(label); }

    let interactionsBlocked = tool.interactionsBlocked;
    let config: Array<{field: string, handler: string}> | undefined;

    registerTool(tool);

    tool.settings.subscribe((settings) => {
        if (settings && settings.fields) {
            config = settings.fields;
        }
    });

    map.on("mouseLeftClick", (l: MouseLocation) => {
        if($interactionsBlocked) return;

        map.getFeatureInfo(new FeatureInfoRequestOptions(l.x, l.y));

        if (!featureInfoView) {
            showFeatureInfo();
        }
    });


    function showFeatureInfo() {
        const container = getMapContainer();

        if (featureInfoView) {
            featureInfoView.$destroy();
        }

        featureInfoView = new FeatureInfoView({
            target: container,
            props: {
                map: map,
                label: label,
                linkFields: config,
                //textNoData: textNoData,
            }
        });

        featureInfoView.$on("remove", () => {
            // @ts-ignore
            featureInfoView.$destroy();
            featureInfoView = undefined;
        });
    }
</script>
