<script lang="ts">
    import { getContext } from "svelte";
    import { _ } from "svelte-i18n";
	import { Information } from "carbon-icons-svelte";

    import type { MouseLocation } from "$lib/map-core/mouse-location";
    import { FeatureInfoRequestOptions } from "$lib/map-core/FeatureInfo/feature-info-request-options";
    import { MapToolMenuOption } from "../MapToolMenuOption";
    import FeatureInfoView from "./FeatureInfoView.svelte";

    const { registerTool, map, getMapContainer } = getContext<any>("mapTools");

    const tool = new MapToolMenuOption("featureinfo", Information, "", false, undefined, false);
    $: tool.label.set($_("tools.featureInfo.label"));

    const interactionsBlocked = tool.interactionsBlocked;
    let config: Array<{field: string, handler: string}> | undefined;
    let featureInfoView: FeatureInfoView | undefined = undefined;

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
                label: $_("tools.featureInfo.label"),
                linkFields: config
            }
        });

        featureInfoView.$on("remove", () => {
            // @ts-ignore
            featureInfoView.$destroy();
            featureInfoView = undefined;
        });
    }
</script>
