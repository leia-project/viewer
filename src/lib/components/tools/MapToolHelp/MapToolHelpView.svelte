<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import type { ComponentType } from "svelte";
    import { get, writable, type Unsubscriber } from "svelte/store";
    import { _ } from "svelte-i18n";
    import { Tabs, Tab } from "carbon-components-svelte";
    import { Modal } from "carbon-components-svelte";

    import { app } from '$lib/app/app';
    import TabIntro from './Tabs/TabIntro.svelte';
    import TabMovement from './Tabs/TabMovement.svelte';
    import TabLibrary from './Tabs/TabLibrary.svelte';
    import TabFlooding from "./Tabs/TabFlooding.svelte";
    import TabStories from "./Tabs/TabStories.svelte";
    import TabIsochrones from "./Tabs/TabIsochrones.svelte";
    import TabZonalStatistics from "./Tabs/TabZonalStatistics.svelte";
	import type { IDownloadButton } from "./download-button";
    

    export let showOnStart: boolean = false;

    interface ITabComponent {
        label: string;
        component: ComponentType;
        props?: Record<string, any>;
    }

    // A tab that is only shown when its tool is enabled in the config.
    interface IToolTab {
        id: string;
        component: ComponentType;
        props?: Record<string, any>;
    }

	const map = app.map;
    const base = process.env.APP_URL;
    const dispatch = createEventDispatcher();

    let selectedTab = 0;

    const toolConfigs = writable<Record<string, any>>({});
    const tabs = writable<ITabComponent[]>([]);
    const unsubscribers: Unsubscriber[] = [];

    onMount(() => {
        const tools = $map?.config?.tools;
        if (Array.isArray(tools)) {
            toolConfigs.set(Object.fromEntries(tools.map((tool: any) => [tool.id, tool])));
        }
        // Rebuild when the config arrives and when the language changes.
        unsubscribers.push(toolConfigs.subscribe(buildTabs), _.subscribe(buildTabs));
    });

    onDestroy(() => unsubscribers.forEach((unsubscribe) => unsubscribe()));

    function buildTabs(): void {
        const configs = get(toolConfigs);
        const translate = get(_);
        // The help texts name the tool as it appears in the menu: its `alias` when set, its own label otherwise.
        const toolTitle = (id: string): string => configs[id]?.settings?.alias || translate(`tools.${id}.label`);

        const toolTabs: IToolTab[] = [
            { id: "flooding", component: TabFlooding },
            { id: "stories", component: TabStories, props: storyProps(configs) },
            { id: "isochrones", component: TabIsochrones },
            { id: "zonalStatistics", component: TabZonalStatistics }
        ];

        tabs.set([
            { label: translate("tools.help.tabs.intro"), component: TabIntro, props: introProps(configs) },
            { label: translate("tools.help.tabs.movement"), component: TabMovement, props: { _, base } },
            { label: toolTitle("layerLibrary"), component: TabLibrary, props: { _, base } },
            ...toolTabs
                .filter(({ id }) => configs[id]?.enabled === true)
                .map(({ id, component, props }) => {
                    const label = toolTitle(id);
                    return { label, component, props: { _, base, toolTitle: label, ...props } };
                })
        ]);
    }

    function introProps(configs: Record<string, any>): Record<string, any> {
        const intro = configs["help"]?.settings?.introSettings;
        const button = intro?.downloadButton;
        return {
            customIntroText: intro?.customDescription ?? undefined,
            downloadButton: (button?.enabled && button.url && button.label ? button : undefined) as IDownloadButton | undefined
        };
    }

    function storyProps(configs: Record<string, any>): Record<string, any> {
        const stories = configs["stories"]?.settings?.stories;
        return {
            storyToolRequestPolygonArea: Array.isArray(stories)
                ? stories.some((story: any) => story?.requestPolygonArea?.enabled)
                : false
        };
    }

    function removeFromViewDontShowAgain(e: any): void {
        handleE(e);
        dispatch("removeDontShow");
    }

    function removeFromView(e: any): void {
        handleE(e);
        dispatch("remove");
    }

    function handleE(e: any): void {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<help>
    <Modal
        open={true}
        modalHeading={$map?.config?.name ?? $_("tools.help.title")}
        primaryButtonText={$_("tools.help.close")}
        secondaryButtonText={showOnStart ? $_("tools.help.closeDontShowOnStart") : ""}
        size="lg"
        style="margin-bottom: 0;"
        on:click:button--secondary={(e) => {
            removeFromViewDontShowAgain(e);
        }}
        on:open
        on:close={(e) => {
            removeFromView(e);
        }}
        on:submit={(e) => {
            removeFromView(e);
        }}
        >

        <div class="wrapper">
            <div class="tabs">
                <Tabs autoWidth bind:selected={selectedTab}>
                    {#each $tabs as { label }}
                            <Tab label={label} />
                    {/each}
                </Tabs>
            </div>

            <div class="content">
                {#if $tabs[selectedTab]}
                    <svelte:component this={$tabs[selectedTab].component} {...$tabs[selectedTab].props} />
                {/if}
            </div>
        </div>
    </Modal>
</help>

<style>
    * {
        color: var(--gm-black-color, #333);
    }

    .wrapper {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .tabs {
        margin-bottom: var(--cds-spacing-05);
    }

    :global(help .bx--modal-content) {
        margin-bottom: var(--cds-spacing-05);
    }

    .content {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background-color: var(--cds-ui-02);
        padding: var(--cds-spacing-05);
        flex-grow: 1;
        overflow-x: hidden;
        overflow-y: auto;
    }

    :global(help-key) {
        color: black;
        background-color: lightgray;
        border-radius: 6px;
        padding-left: var(--cds-spacing-02);
        padding-right: var(--cds-spacing-02);
        padding-top: var(--cds-spacing-02);
        padding-bottom: var(--cds-spacing-02);
        font-family: monospace;
        font-size: 12px;
        line-height: 5px;
    }

    :global(a:hover[role=tab]) {
        text-decoration: none;
    }
</style>
