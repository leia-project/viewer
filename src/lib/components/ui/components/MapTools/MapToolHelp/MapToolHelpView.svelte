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
    
    // const { map } = getContext<any>("mapTools");
	import { app } from '$lib/app/app';
	import Divider from "../../Divider/Divider.svelte";

	$: map = get(app.map);

    // let floodingTool: any = { enabled: false };
    let floodingToolEnabled: boolean = false
    let storyToolEnabled: boolean = false
   
    onMount(() => {
        try {
            if (map) {
                if (map.config && map.config.tools) {
                    let floodingTool = map.config.tools.find((t: any) => t.id === "flooding");
                    floodingToolEnabled = floodingTool ? floodingTool.enabled : false;
                    let storyTool = map.config.tools.find((t: any) => t.id === "stories");
                    storyToolEnabled = storyTool ? storyTool.enabled : false;
                }
            }
        } catch (error) {
            console.error("Error accessing map context:", error);
        }
    });
    
    const base = process.env.APP_URL;

    export let txtTitle: string;
    export let txtIntro: string;
    export let showOnStart: boolean;

    let selectedTab = 0;
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
        style="margin-bottom: 0"
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
                <Tabs bind:selected={selectedTab}>
                    <Tab label={$_("tools.help.tabs.intro")} />
                    <Tab label={$_("tools.help.tabs.movement")} />
                    <Tab label={$_("tools.help.tabs.library")} />
                    {#if floodingToolEnabled}
                        <Tab label={$_("tools.help.tabs.flood")} />
                    {/if}
                    {#if storyToolEnabled}
                        <Tab label={$_("tools.help.tabs.stories")} />
                    {/if}
                </Tabs>
            </div>

            <div class="content">
                <div>
                    {#if selectedTab === 0}
                        <TabIntro txtIntro={txtIntro}/>
                    {/if}

                    {#if selectedTab === 1}
                        <TabMovement {base}{_}/>
                    {/if}

                    {#if selectedTab === 2}
                        <TabLibrary {base}{_}/>
                    {/if}

                    {#if selectedTab === 3 && floodingToolEnabled}
                        <TabFlooding {base}{_}/>
                    {/if}

                    {#if selectedTab === 4 && storyToolEnabled}
                        <TabStories {_}/>
                    {/if}
                </div>
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
