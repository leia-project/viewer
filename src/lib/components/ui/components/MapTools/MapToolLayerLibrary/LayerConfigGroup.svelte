<script lang="ts">
    import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
    import { Tag, OverflowMenu, OverflowMenuItem } from "carbon-components-svelte";
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
    import LibraryLayer from "./LibraryLayer.svelte";
    import type { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";
    import type { LayerLibrary } from "$lib/components/map-core/layer-library";

    export let library: LayerLibrary;
    export let group: LayerConfigGroup;
    export let textBaselayers: string;
    export let textNoCategory: string;

    $: childGroups = group.childGroups;
    $: layerConfigs = group.layerConfigs;
    $: open = group.open;
    $: totalLayercount = group.totalLayerCount;
    $: enabledLayercount = group.enabledLayerCount;

    function addAllLayers(): void {
        group.addAllLayers();
    }

    function removeAllLayers(): void {
        group.removeAllLayers();
    }
</script>

{#if $totalLayercount > 0}
    <div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="group"
            on:click={() => {
                open.set(!get(open));
            }}
            role="button"
            tabindex="0"
        >
            <div class="chevron" class:chevron-rotated={$open}>
                <ChevronRight />
            </div>
            <div class="group-title">
                {#if group.id === "group_background"}
                    {textBaselayers}
                {:else if group.id === "group_uncategorised"}
                    {textNoCategory}
                {:else}
                    {group.title}
                {/if}
            </div>

            <div class="group-menu">
                <OverflowMenu
                    size="sm"
                    flipped
                    on:click={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <div slot="menu">
                        <Tag size="sm">
                            {$enabledLayercount}/{$totalLayercount}
                        </Tag>
                    </div>

                    <OverflowMenuItem
                        text="{ $_("tools.layerLibrary.btnAddAllToMap") }"
                        on:click={(e) => {
                            addAllLayers();
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        }}
                    />
                    <OverflowMenuItem
                        text="{ $_("tools.layerLibrary.btnRemoveAllFromMap") }"
                        on:click={(e) => {
                            removeAllLayers();
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        }}
                    />
                </OverflowMenu>
            </div>
        </div>

        {#if $open}
            <div class="group-content-wrapper">
                {#if $childGroups && $childGroups.length > 0}
                    <div class="group-content">
                        <div class="children">
                            {#each $childGroups as child}
                                <svelte:self group={child} {library} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if $layerConfigs && $layerConfigs.length > 0}
                    <div class="group-content">
                        <div class="children">
                            {#each $layerConfigs as config}
                                <LibraryLayer {config} {library} />
                            {/each}
                        </div>
                    </div>
                {/if}
                <div class="folder-content-line" />
            </div>
        {/if}
    </div>
{/if}

<style>
    .group {
        display: flex;
        justify-content: left;
        cursor: pointer;
        align-items: center;
        align-content: center;
    }

    .group:hover {
        background-color: var(--cds-ui-03);
    }

    .group-content-wrapper {
        position: relative;
    }

    .group-menu {
        white-space: nowrap;
        height: 100%;
    }

    :global(.group-menu .bx--overflow-menu) {
        width: fit-content;
    }

    .chevron {
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        transition-duration: 0.07s;
    }

    .chevron-rotated {
        transform: rotate(90deg);
        transform-origin: center center;
    }

    .group-title {
        margin-left: var(--cds-spacing-02);
        display: flex;
        align-items: center;
        padding-top: 2px;
        flex-grow: 1;
    }

    .group-content {
        position: relative;
    }

    .children {
        margin-left: var(--cds-spacing-05);
    }

    .folder-content-line {
        position: absolute;
        left: 0.7rem;
        top: 0px;
        width: 1px;
        height: 100%;
        background-color: var(--cds-ui-03);
    }
</style>
