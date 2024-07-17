<script lang="ts">
    import { onDestroy, setContext, getContext } from "svelte";
    import { writable, readable, type Unsubscriber, get } from "svelte/store";
    import ChevronLeft from "carbon-icons-svelte/lib/ChevronLeft.svelte";
    import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";

    import ToolButton from "./MapToolButton.svelte";
    import MapToolHeader from "./MapToolHeader.svelte";

    import type { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
    import type { Map } from "$lib/components/map-cesium/module/map";

    export let expanded: boolean = false;
    export let expandText = "Expand";
    export let collapseText = "Collapse";
    export let map: Map;

    const tools = writable<Array<MapToolMenuOption>>(new Array<MapToolMenuOption>());
    const selectedTool = writable<MapToolMenuOption | undefined>(undefined);

    let toolContainer: HTMLElement;
    let toolContentContainer: HTMLElement;
    let widthUnsubscribe: Unsubscriber | undefined;
    let expandCollapseText = writable<string>(expandText);

    $: {
        expandCollapseText.set(expanded ? collapseText : expandText);
    }

    // If the map is set, pass settings to tool if present
    map.configLoaded.subscribe((loaded) => {
        if (loaded) {
            for (let i = 0; i < $tools.length; i++) {
                loadToolSettings($tools[i].id);
            }
        }
    });

    selectedTool.subscribe((st) => {
        enableInteractions();

        if (widthUnsubscribe) {
            widthUnsubscribe();
        }

        widthUnsubscribe = st
            ? st.width.subscribe((w) => {
                  setToolContainerWidth(w ?? "21rem");
              })
            : undefined;

        if (st && st.blockInteractionsFromOthers) {
            disableInteractionFromOtherTools(st.id);
        }
        if (!st) {
            setToolContainerWidth("0rem");
        }
    });

    function disableInteractionFromOtherTools(id: string) {
        for (let i = 0; i < $tools.length; i++) {
            if ($tools[i].id !== id) {
                $tools[i].interactionsBlocked.set(true);
            }
        }
    }

    function enableInteractions() {
        for (let i = 0; i < $tools.length; i++) {
            $tools[i].interactionsBlocked.set(false);
        }
    }

    function setToolContainerWidth(value: string) {
        if (toolContainer) {
            toolContainer.style.width = value;
        }
    }

    function loadToolSettings(toolId: string) {
        if (!map || !map.toolSettings) {
            return;
        }

        const tool = $tools.find((t) => t.id === toolId);
        const toolConfig = map.toolSettings.find((t: any) => t.id === toolId);

        if (!tool || !toolConfig) {
            return;
        }

        tool.settings.set(toolConfig.settings);
    }

    setContext("mapTools", {
        registerTool: (tool: MapToolMenuOption) => {
            tools.set([...$tools, tool]);
            loadToolSettings(tool.id);
        },
        selectTool: (tool: MapToolMenuOption) => {
            selectedTool.set(tool);
        },
        getMapContainer: () => {
            return map.getContainer();
        },
        disableInteractionFromOtherTools: (id: string) => {
            disableInteractionFromOtherTools(id);
        },
        enableInteractionsFromOtherTools: () => {
            enableInteractions();
        },
        getToolContainer: () => {
            return toolContainer;
        },
        getToolContentContainer: () => {
            return toolContentContainer;
        },
        map,
        selectedTool
    });

    function selectTool(event: CustomEvent<any>, tool: MapToolMenuOption): void {
        if (tool.openMenuOnClick) {
            if ($selectedTool === tool) {
                selectedTool.set(undefined);
            } else {
                selectedTool.set(tool);
            }
        }

        tool.fireClick(event)
    }
</script>

<div class="tosti-tool-menu">
    <div class="options-bar">
        <div class="options">
            {#each $tools as tool}
                {#if tool.bottom !== true && tool.showInToolbar}
                    <ToolButton
                        on:click={(e) => {
                            selectTool(e, tool);
                        }}
                        {tool}
                        showLabel={expanded}
                    />
                {/if}
            {/each}
        </div>

        <div class="options bottom-options">
            {#each $tools as tool}
                {#if tool.bottom === true && tool.showInToolbar}
                    <ToolButton
                        on:click={(e) => {
                            selectTool(e, tool);
                        }}
                        {tool}
                        showLabel={expanded}
                    />
                {/if}
            {/each}

            <ToolButton
                on:click={(e) => {
                    expanded = !expanded;
                }}
                tool={undefined}
                overrideIcon={expanded ? ChevronLeft : ChevronRight}
                overrideLabel={expandCollapseText}
                overrideActive={false}
                showLabel={expanded}
            />
        </div>
    </div>

    <div bind:this={toolContainer} class="tool" class:tool-inactive={$selectedTool === undefined}>
        {#if $selectedTool !== undefined}
            <MapToolHeader
                tool={$selectedTool}
                on:close={() => {
                    selectedTool.set(undefined);
                }}
            />
        {/if}

        <div class="content-wrapper" bind:this={toolContentContainer}>
            <div class="tool-content">
                <slot class="slot" />
            </div>
        </div>
        <div class="overflow-gradient" />
    </div>
</div>

<style>
    .tosti-tool-menu {
        position: relative;
        height: 100%;
        width: fit-content;
        display: flex;
        box-sizing: border-box;
        background-color: var(--cds-ui-02);
    }

    .options-bar {
        height: 100%;
        width: fit-content;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-right: 1px solid var(--cds-ui-03);
    }

    .options {
        display: flex;
        flex-direction: column;
    }

    .tool {
        position: relative;
        height: 100%;
        background-color: var(--cds-ui-02);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 21rem;
    }

    .tool-inactive {
        visibility: hidden;
        width: 0px;
        padding: 0;
        margin: 0;
    }

    .tool-content {
        width: 100%;
        background-color: var(--cds-ui-02);
        overflow: hidden;
        box-sizing: border-box;
        margin-bottom: var(--cds-spacing-07);
    }

    .content-wrapper {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        flex-grow: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-gutter: stable;
    }

    .overflow-gradient {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 1.5rem;
        background: linear-gradient(0deg, var(--cds-ui-02) 5%, rgba(218, 28, 28, 0) 100%);
        z-index: 1;
    }
</style>
