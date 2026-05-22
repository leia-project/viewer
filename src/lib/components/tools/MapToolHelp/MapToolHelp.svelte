<script lang="ts">
    import { getContext } from "svelte";
    import { _ } from "svelte-i18n";
    import { get, writable } from "svelte/store";
	import { Help } from "carbon-icons-svelte";
    import { appStorage } from "$lib/i18n/app-storage";
    import { MapToolMenuOption } from "../MapToolMenuOption";
    import MapToolHelpView from "./MapToolHelpView.svelte";

    const { registerTool, getMapContainer } = getContext<any>("mapTools");

    export let id: string;
    export let label: string;
    export let icon: any = Help;

    const showOnStart = writable<boolean>(false);

    const tool = new MapToolMenuOption(id, icon, label, true, undefined, true, false);
    registerTool(tool);

    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showHelp();
    };

    tool.settings.subscribe((settings) => {
        if (settings) {
            if (settings.showOnStart !== undefined) {
                const init = appStorage.getValue("showHelpOnStart", settings.showOnStart);
                appStorage.register<boolean>(showOnStart, "showHelpOnStart", init);

                if (settings.showOnStart === true && init === true) {
                    showHelp();
                }
            }
        }
    });

    let helpView: MapToolHelpView | undefined = undefined;

    function showHelp(): void {
        const container = getMapContainer();

        if (helpView) {
            helpView.$destroy();
        }

        helpView = new MapToolHelpView({
            target: container,
            props: {
                showOnStart: get(showOnStart)
            }
        });

        helpView.$on("remove", () => {
            removeView();
        });

        helpView.$on("removeDontShow", () => {
            showOnStart.set(false);
            removeView();
        });
    }

    function removeView(): void {
        if (helpView) {
            helpView.$destroy();
            helpView = undefined;
        }
    }
</script>
