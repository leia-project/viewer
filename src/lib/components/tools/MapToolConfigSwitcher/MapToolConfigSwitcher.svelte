<script lang="ts">
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
	import { Switcher } from "carbon-icons-svelte";
    import { app } from "$lib/app/app";
    import { MapToolMenuOption } from "../MapToolMenuOption";
    import MapToolConfigSwitcherView from "./MapToolConfigSwitcherView.svelte";
	import { Config } from "$lib/map-core/config/config";
    import { ConfigSettings } from '$lib/app/config-settings';

    const { registerTool, getMapContainer } = getContext<any>("mapTools");

    export let txtTitle = get(_)("tools.config_switcher.title");
    export let txtIntro = get(_)("tools.config_switcher.intro");

    let configSwitcherView: MapToolConfigSwitcherView | undefined = undefined;

    let configs = new Array<Config>();

    const tool = new MapToolMenuOption("config_switcher", Switcher, "", true, undefined, true, false);
    $: tool.label.set($_("tools.config_switcher.label"));


    tool.onToolButtonClick = (e: CustomEvent<any>) => {
        showConfigSwitcher();
    };

    registerTool(tool);

    tool.settings.subscribe(async (settings) => {
        if (settings) {
            if (settings.title) {
                txtTitle = settings.title;
            }

            if (settings.intro) {
                txtIntro = settings.intro;
            }

            if (process.env.CONFIG_SERVER_URL) {
                await getConfigs();
            }

        }
    });

    function showConfigSwitcher(): void {
        const container = getMapContainer();

        if (configSwitcherView) {
            configSwitcherView.$destroy();
        }

        configSwitcherView = new MapToolConfigSwitcherView({
            target: container,
            props: {
                txtTitle: txtTitle,
                txtIntro: txtIntro,
                configs: configs
            }
        });

        configSwitcherView.$on("remove", () => {
            removeView();
        });

        configSwitcherView.$on("change", (e) => {
            if (get(tool.settings).fullReload) {
                const url = new URL(e.detail.configUrl);
                const parts = url.pathname.split("/");
                const slug = parts[parts.length - 1].split(".")[0];
                window.location.href = slug;
            } else {
                app.configSettings.set(new ConfigSettings(e.detail.configUrl));
                app.loadMap(true);
                removeView();
            }
        });
    }

    function removeView(): void {
        if (configSwitcherView) {
            configSwitcherView.$destroy();
            configSwitcherView = undefined;
        }
    }

    async function getConfigs(): Promise<void> {
        const result = await fetch(`${process.env.CONFIG_SERVER_URL}/overview?mode=dt`);
        configs = await result.json();
    }

</script>
