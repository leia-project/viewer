<script lang="ts">
    import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
    import Tools from "carbon-icons-svelte/lib/Tools.svelte";
    import { Tag, OverflowMenu, OverflowMenuItem, Accordion } from "carbon-components-svelte";
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
    import type { LayerManagerGroup } from "$lib/map-core/layer-manager-group";
    import type { LayerLibrary } from "$lib/map-core/layer-library";
	import MapToolLayerControl from "./MapToolLayerControl.svelte";

    export let library: LayerLibrary;
    export let group: LayerManagerGroup;

    $: childGroups = group.childGroups;
    $: layers = group.layers;
    $: open = group.open;
    $: totalLayercount = group.totalLayerCount;
    $: visibleLayercount = group.visibleLayerCount;

    function addAllLayers(): void {
        group.showAllLayers();
    }

    function removeAllLayers(): void {
        group.hideAllLayers();
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
                    {$_("tools.layerLibrary.baseLayers")}
                {:else if group.id === "group_uncategorised"}
                    {$_("tools.layerLibrary.noCategory")}
                {:else if group.id === "dataportal"}
                    {$_('tools.layerManager.dataportal')}
                {:else}
                    {group.title}
                {/if}
            </div>
            {#if group.toolGroup}
                <span class="tool-group-icon" title={$_('tools.layerManager.toolGroupTooltip', { values: { tool: $_(group.toolGroup.label) } })}>
                    <Tools size={16} />
                </span>
            {/if}
            {#if group.connector.type && group.connector.url}
                <a class="connector-tag" href="{group.connector.url}" title="{$_('general.goTo') + ' ' + group.connector.type}" target="_blank" style="cursor: pointer">
                    <Tag type="green" size="sm" interactive="{true}">{group.connector.type}</Tag>
                </a>
            {/if}

            <div class="group-menu" title={$_("tools.layerManager.showHideAllTooltip")}>
                <OverflowMenu
                    size="sm"
                    flipped
                    on:click={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <div slot="menu">
                        <Tag size="sm">
                            {$visibleLayercount}/{$totalLayercount}
                        </Tag>
                    </div>

                    <OverflowMenuItem
                        text="{ $_("tools.layerManager.btnShowAll") }"
                        on:click={(e) => {
                            addAllLayers();
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        }}
                    />
                    <OverflowMenuItem
                        text="{ $_("tools.layerManager.btnHideAll") }"
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
            <Accordion class="layer-group-accordion">
                {#if $childGroups && $childGroups.length > 0}
                    <div class="group-content">
                        <div class="children">
                            {#each $childGroups as child}
                                <svelte:self group={child} {library} />
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if $layers && $layers.length > 0}
                    <div class="group-content">
                        <div class="children">
                            {#each $layers as layer}
                                <MapToolLayerControl {layer} />
                            {/each}
                        </div>
                    </div>
                {/if}
                <!-- <div class="folder-content-line" /> -->
                </Accordion>
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

    .group:hover .chevron {
        color: var(--cds-link-primary, #0f62fe);
    }

    .group:hover:has(.group-menu:hover) .chevron,
    .group:hover:has(.connector-tag:hover) .chevron {
        color: inherit;
    }

    .group-menu {
        white-space: nowrap;
        height: 100%;
    }

    :global(.group-menu .bx--overflow-menu),
    :global(.group-menu .bx--overflow-menu__trigger) {
        width: fit-content;
        cursor: pointer;
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

    .tool-group-icon {
        display: flex;
        align-items: center;
        margin-right: var(--cds-spacing-02);
        color: var(--cds-icon-02, var(--cds-text-02));
        cursor: help;
    }

</style>
