<script lang="ts">
    import { app } from "$lib/app/app";
    import { getContext } from "svelte";
    import { _ } from "svelte-i18n";
    import { get, writable } from "svelte/store";
    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";
    import Switcher from "carbon-icons-svelte/lib/Switcher.svelte";
    import MapToolConfigSwitcherView from "./MapToolConfigSwitcherView.svelte";
	import { Config } from "$lib/components/map-core/config/config";
    import type { Map } from "$lib/components/map-cesium/module/map";
    import { ConfigSettings } from '$lib/app/config-settings';




    const { registerTool, getMapContainer, map } = getContext<any>("mapTools");

    let id: string = "config_switcher";
    export let icon: any = Switcher;
    export let label: string = get(_)("tools.config_switcher.label");
    export let txtTitle = get(_)("tools.config_switcher.title");
    export let txtIntro = get(_)("tools.config_switcher.intro");

    let configSwitcherView: MapToolConfigSwitcherView | undefined = undefined;
    let tool = new MapToolMenuOption(id, icon, label, true, undefined, true, false);

    let configs = new Array<Config>();

    $: {
        tool.label.set(label);
    }
    $: settings = tool.settings;

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
            if ($settings.fullReload) {
                let url = new URL(e.detail.configUrl);
                let parts = url.pathname.split("/");
                let slug = parts[parts.length - 1].split(".")[0];
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
        const result = await fetch(`${process.env.CONFIG_SERVER_URL}/overview`);
        configs = await result.json();
    }

    
    
</script>
