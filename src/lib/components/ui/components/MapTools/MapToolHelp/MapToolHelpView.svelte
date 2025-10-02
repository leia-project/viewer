<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { Tabs, Tab } from "carbon-components-svelte";
    import { Modal } from "carbon-components-svelte";
    import { _ } from "svelte-i18n";
    import { getContext } from "svelte";
    import { get } from "svelte/store";
    
       // Initialize with default values
    let map: any;
    let floodingTool: any = { enabled: false };
    
    onMount(() => {
        try {
            // Safely get map from context
            const context = getContext<any>("mapTools");
            if (context && context.map) {
                map = context.map;
                
                // Subscribe to config changes if available
                if (map.configLoaded) {
                    map.configLoaded.subscribe((loaded: boolean) => {
                        if (loaded && map.config && map.config.tools) {
                            const tool = map.config.tools.find((t: any) => t.id === "flooding");
                            if (tool) {
                                floodingTool = tool;
                                console.log(tool.enabled, 'floodTool');
                            }
                        }
                    });
                }
                
                // Initialize with current config if available
                if (map.config && map.config.tools) {
                    const tool = map.config.tools.find((t: any) => t.id === "flooding");
                    if (tool) {
                        floodingTool = tool;
                    }
                }
            }
        } catch (error) {
            console.error("Error accessing map context:", error);
        }
    });

    export let txtTitle: string;
    export let txtIntro: string;
    export let showOnStart: boolean;

    let selectedTab = 0;
    const dispatch = createEventDispatcher();
    const base = process.env.APP_URL;

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
                    {#if floodingTool && floodingTool.enabled}
                        <Tab label={$_("tools.help.tabs.flood")} />
                    {/if}
                </Tabs>
            </div>

            <div class="content">
                <div>
                    {#if selectedTab === 0}
                        {@html txtIntro}
                    {/if}

                    {#if selectedTab === 1}
                        <div class="heading-02">{$_("tools.help.movement.headingZoom")}</div>
                        <div class="video">
                            <video autoplay loop muted style="width:100%">
                                <source src="{base}/images/movement.mp4" type="video/mp4" />
                            </video>
                        </div>
                        <div class="body-02">
                            {$_("tools.help.movement.zoomDescription")}<br />
                            {$_("tools.help.movement.zoomOption1")}<br />
                            {$_("tools.help.movement.zoomOption2")}<br />
                            {$_("tools.help.movement.zoomOption3")}<br /><br />
                        </div>

                        <div class="heading-02">{$_("tools.help.movement.headingRotatePitch")}</div>

                        <div class="body-02">
                            {$_("tools.help.movement.rotatePitchDescription")} <br />
                            {$_("tools.help.movement.rotatePitchOption1")} <br />
                            {@html $_("tools.help.movement.rotatePitchOption2")}<br /><br />
                        </div>

                        <div class="heading-02">{$_("tools.help.movement.headingButtons")}</div>
                        <div class="body-02">{$_("tools.help.movement.buttonsDescription")}</div>

                        <div class="button">
                            <img src="{base}/images/map_home.png" alt="home" />
                            <div class="body-01">{$_("tools.help.movement.buttonsHome")}</div>
                        </div>

                        <div class="button">
                            <img src="{base}/images/map_compass.png" alt="compass" />
                            <div class="body-01">{$_("tools.help.movement.buttonsCompass")}</div>
                        </div>

                        <div class="button">
                            <img src="{base}/images/map_zoom_in.png" alt="zoom-in" />
                            <div class="body-01">{$_("tools.help.movement.buttonsZoomIn")}</div>
                        </div>
                        <div class="button">
                            <img src="{base}/images/map_zoom_out.png" alt="zoom-out" />
                            <div class="body-01">{$_("tools.help.movement.buttonsZoomOut")}</div>
                        </div>
                    {/if}

                    {#if selectedTab === 2}
                        <div class="img-library">
                            <img src="{base}/images/help_library_1.png" alt="library icon" />
                        </div>

                        <div class="body-02">
                            {$_("tools.help.library.description")}<br /><br />
                        </div>

                        <div class="heading-02">{$_("tools.help.library.headingLibraryOpen")}</div>
                        <div class="body-02">
                            {$_("tools.help.library.openLibrary")}<br /><br />
                        </div>

                        <div class="heading-02">{$_("tools.help.library.headingUsingLibrary")}</div>
                        <div class="body-02">
                            {$_("tools.help.library.libraryDescription")}<br /><br />
                        </div>

                        <img src="{base}/images/help_library_2.png" style="width:100%" alt="library view" />
                    {/if}

                    {#if selectedTab === 3 && floodingTool && floodingTool.enabled}

                        <div class="img-library">
                            <img src="{base}/images/help_flood_1.png" alt="flood icon" />
                        </div>

                        <div class="body-02">
                            {$_("tools.help.flood.description")}<br /><br />
                        </div>

                        <div class="heading-02">{$_("tools.help.flood.headingFloodOpen")}</div>
                        <div class="body-02">
                            {$_("tools.help.flood.openFlood")}<br /><br />
                        </div>

                        <div class="heading-02">{$_("tools.help.flood.headingUsingFlood")}</div>
                        <div class="body-02">
                            {$_("tools.help.flood.floodDescription")}<br /><br />
                        </div>

                        <img src="{base}/images/help_flood_2.png" style="width:100%" alt="flood view" />
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

    .button {
        display: flex;
        margin-top: var(--cds-spacing-03);
    }

    .button .body-01 {
        padding-left: var(--cds-spacing-05);
        height: 100%;
        padding-top: var(--cds-spacing-04);
    }

    .video {
        margin-top: var(--cds-spacing-05);
        margin-left: var(--cds-spacing-05);
        width: 100%;
        text-align: center;
    }

    :global(a:hover[role=tab]) {
        text-decoration: none;
    }

    video {
        border: 1px solid var(--cds-ui-03);
        float: right;
    }

    .img-library {
        float: right;
        border: 1px solid var(--cds-ui-03);
        margin-left: var(--cds-spacing-05);
    }
</style>
