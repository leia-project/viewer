<script lang="ts">
    import { getContext } from "svelte";
    import { _ } from "svelte-i18n";
    import { get, writable } from "svelte/store";
    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";
    import Help from "carbon-icons-svelte/lib/Help.svelte";
    import MapToolHelpView from "./MapToolHelpView.svelte";
    import { appStorage } from "$lib/components/localization/app-storage";

    const { registerTool, getMapContainer } = getContext<any>("mapTools");

    let id: string = "help";
    export let icon: any = Help;
    export let label: string = get(_)("tools.help.help");
    export let txtTitle = get(_)("tools.help.title");
    export let txtIntro = get(_)("tools.help.intro");

    let helpView: MapToolHelpView | undefined = undefined;
    let tool = new MapToolMenuOption(id, icon, label, true, undefined, true, false);
    const showOnStart = writable<boolean>(false);

    $: {
        tool.label.set(label);
    }

    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showHelp();
    };

    registerTool(tool);

    tool.settings.subscribe((settings) => {
        if (settings) {
            if (settings.title) {
                txtTitle = settings.title;
            }

            if (settings.intro) {
                txtIntro = settings.intro;
            }

            if (settings.showOnStart !== undefined) {
                const init = appStorage.getValue("showHelpOnStart", settings.showOnStart);
                appStorage.register<boolean>(showOnStart, "showHelpOnStart", init);

                if (settings.showOnStart === true && init === true) {
                    showHelp();
                }
            }
        }
    });

    function showHelp(): void {
        const container = getMapContainer();

        if (helpView) {
            helpView.$destroy();
        }

        helpView = new MapToolHelpView({
            target: container,
            props: {
                txtTitle: txtTitle,
                txtIntro: txtIntro,
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
