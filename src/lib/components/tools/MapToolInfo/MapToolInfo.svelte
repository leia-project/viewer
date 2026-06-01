<script lang="ts">
    import { getContext, SvelteComponent } from "svelte";
    import { _ } from "svelte-i18n";
	import { Information } from "carbon-icons-svelte";
    import { MapToolMenuOption } from "../MapToolMenuOption";
    import MapToolInfoView from "./MapToolInfoView.svelte";
    import type { Attribution } from "./attribution";
    
    const { registerTool, getMapContainer } = getContext<any>("mapTools");

    export let id: string;
    export let label: string;
    export let icon: SvelteComponent = Information;

    export let txtViewerTitle: string | undefined = undefined;
    export let txtViewerDescription: string | undefined = undefined;
    export let attribution: Array<Attribution> = new Array<Attribution>();
    
    const tool = new MapToolMenuOption(id, icon, label, true, undefined, true, false);
    registerTool(tool);

    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showInfo();
    };

    tool.settings.subscribe((settings) => {
        if (settings) {
            if(settings.title) {
                txtViewerTitle = settings.title;
            }

            if (settings.description) {
                txtViewerDescription = settings.description;
            }            
        }
    });

    let infoView: MapToolInfoView | undefined = undefined;

    function showInfo(): void {
        const container = getMapContainer();

        if (infoView) {
            infoView.$destroy();
        }

        infoView = new MapToolInfoView({
            target: container,
            props: {
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
