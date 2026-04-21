<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { Tabs, Tab } from "carbon-components-svelte";
    import { Modal } from "carbon-components-svelte";
    import { _ } from "svelte-i18n";
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    import TabIntro from './Tabs/TabIntro.svelte';
    import TabMovement from './Tabs/TabMovement.svelte';
    import TabLibrary from './Tabs/TabLibrary.svelte';
    import TabFlooding from "./Tabs/TabFlooding.svelte";
    import TabStories from "./Tabs/TabStories.svelte";
    import TabRainStress from "./Tabs/TabRainStress.svelte";
    import TabIsochrones from "./Tabs/TabIsochrones.svelte";
    
    // const { map } = getContext<any>("mapTools");
	import { app } from '$lib/app/app';


	$: map = get(app.map);

    let customIntroText: string | undefined = undefined;
    let downloadButtonEnabled: boolean | undefined = undefined;
    let downloadButtonUrl: string | undefined = undefined;
    let downloadButtonLabel: string |undefined = undefined;

    let floodingToolEnabled: boolean = false;
    let rainStressToolEnabled: boolean = false;
    let storyToolEnabled: boolean = false;
    let isochronesToolEnabled: boolean = false;

    //TODO: Integrate this properly
    interface IDownloadButton {
        enabled: boolean;
        url: string;
        label: string;
    }

    let downloadButton: IDownloadButton | undefined = undefined;

    onMount(() => {
        try {
            if (map) {
                if (map.config && map.config.tools) {
                    // Prepare intro tab data
                    let helpTool = map.config.tools.find((t: any) => t.id === "help");

                    customIntroText = helpTool.settings.introSettings?.customDescription ?? undefined;
                    downloadButtonEnabled = helpTool.settings.introSettings?.downloadButton?.enabled ?? false;
                    downloadButtonUrl = helpTool.settings.introSettings?.downloadButton?.url ?? undefined;
                    downloadButtonLabel = helpTool.settings.introSettings?.downloadButton?.label ?? undefined;
                    if (downloadButtonEnabled && downloadButtonUrl && downloadButtonLabel) {
                        downloadButton = {
                            enabled: downloadButtonEnabled,
                            url: downloadButtonUrl,
                            label: downloadButtonLabel
                        };
                    }
                    
                    // Prepare data for optional tabs
                    let floodingTool = map.config.tools.find((t: any) => t.id === "flooding");
                    floodingToolEnabled = floodingTool ? floodingTool.enabled : false;

                    let rainStressTool = map.config.tools.find((t: any) => t.id === "rainStress");
                    rainStressToolEnabled = rainStressTool ? rainStressTool.enabled : false;

                    let storyTool = map.config.tools.find((t: any) => t.id === "stories");
                    storyToolEnabled = storyTool ? storyTool.enabled : false;

                    let isochronesTool = map.config.tools.find((t: any) => t.id === "isochrones");
                    isochronesToolEnabled = isochronesTool ? isochronesTool.enabled : false;
                }
            }
        } catch (error) {
            console.error("Error accessing map context:", error);
        }
    });

    const base = process.env.APP_URL;
    export let txtTitle: string;
    export let showOnStart: boolean;

    let selectedTab = 0;

    interface ITabComponent {
        label: string;
        component: typeof TabIntro | typeof TabMovement | typeof TabLibrary | typeof TabFlooding | typeof TabRainStress | typeof TabStories | typeof TabIsochrones;
        enabled: boolean;
        props?: any;
    }
      
    $: tabs = [
        { label: $_("tools.help.tabs.intro"), component: TabIntro, enabled: true, props: { customIntroText, downloadButton }},
        { label: $_("tools.help.tabs.movement"), component: TabMovement, enabled: true, props: { _, base }},
        { label: $_("tools.help.tabs.library"), component: TabLibrary, enabled: true, props: { _, base }},
        { label: $_("tools.help.tabs.flood"), component: TabFlooding, enabled: floodingToolEnabled, props: { _, base }},
        { label: $_("tools.help.tabs.rainStress"), component: TabRainStress, enabled: rainStressToolEnabled, props: { _, base }},
        { label: $_("tools.help.tabs.stories"), component: TabStories, enabled: storyToolEnabled, props: { _, base }},
        { label: $_("tools.help.tabs.isochrones"), component: TabIsochrones, enabled: isochronesToolEnabled, props: { _, base }},
    ] as ITabComponent[];

    $: enabledTabs = tabs.filter(tab => tab.enabled);
    
    const dispatch = createEventDispatcher();

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
        modalHeading={txtTitle}
        primaryButtonText="{$_("tools.help.close")}"
        secondaryButtonText={ showOnStart ? $_("tools.help.closeDontShowOnStart") : ""}
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
                    {#each enabledTabs as { label }, index}
                            <Tab label={label} />
                    {/each}
                </Tabs>
            </div>

            <div class="content">
                {#if enabledTabs[selectedTab].enabled}
                    <svelte:component this={enabledTabs[selectedTab].component} {...enabledTabs[selectedTab].props} />
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
        overflow-y: scroll;
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
