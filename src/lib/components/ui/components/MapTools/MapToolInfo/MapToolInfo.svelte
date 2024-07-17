<script lang="ts">
    import { getContext } from "svelte";
    import { _ } from "svelte-i18n";
    import { get } from "svelte/store";
    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";
    import Information from "carbon-icons-svelte/lib/Information.svelte";
    import MapToolInfoView from "./MapToolInfoView.svelte";
    import type { Attribution } from "$lib/components/ui/models/Attribution";
    
    const { registerTool, getMapContainer } = getContext<any>("mapTools");

    let id: string = "info";
    export let icon: any = Information;
    export let label: string = "Info";

    export let txtTitle = get(_)("tools.info.info");
    export let txtClose = get(_)("tools.info.close");
    export let txtGeneral = get(_)("tools.info.general");
    export let txtAttribution = get(_)("tools.info.attribution");
    export let txtViewerTitle: string | undefined = undefined;
    export let txtViewerDescription: string | undefined = undefined;
    export let attribution: Array<Attribution> = new Array<Attribution>();

    let infoView: MapToolInfoView | undefined = undefined;
    let tool = new MapToolMenuOption(id, icon, label, true, undefined, true, false);
    $: { tool.label.set(label); }

    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showInfo();
    };

    registerTool(tool);

    tool.settings.subscribe((settings) => {
        if (settings) {
            if(settings.title) {
                txtViewerTitle = settings.title;
            }

            if(settings.description) {
                txtViewerDescription = settings.description;
            }            
        }
    });

    function showInfo(): void {
        const container = getMapContainer();

        if (infoView) {
            infoView.$destroy();
        }

        infoView = new MapToolInfoView({
            target: container,
            props: {
               txtTitle: txtTitle,
               txtClose: txtClose,
               txtGeneral: txtGeneral,
               txtAttribution: txtAttribution,
               txtViewerTitle: txtViewerTitle,
               txtViewerDescription: txtViewerDescription,
               attribution: attribution
            }
        });

        infoView.$on("remove", () => {
            // @ts-ignore
            infoView.$destroy();
            infoView = undefined;
        });
    }

</script>
