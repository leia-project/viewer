<script lang="ts">
    import { get } from "svelte/store";
    import { _ } from "svelte-i18n";
    import { Tag, OverflowMenu, OverflowMenuItem } from "carbon-components-svelte";
	import { ChevronRight, Tools } from "carbon-icons-svelte";
    import type { LayerConfigGroup } from "$lib/map-core/layer-config-group";
    import type { LayerLibrary } from "$lib/map-core/layer-library";
    import LibraryLayer from "./LibraryLayer.svelte";

    export let library: LayerLibrary;
    export let group: LayerConfigGroup;
    export let textBaselayers: string;
    export let textNoCategory: string;

    $: childGroups = group.childGroups;
    $: layerConfigs = group.layerConfigs;
    $: open = group.open;
    $: totalLayercount = group.totalLayerCount;
    $: enabledLayercount = group.enabledLayerCount;

    $: displayTitle =
        group.id === "group_background"
            ? textBaselayers
            : group.id === "group_uncategorised"
              ? textNoCategory
              : group.id === "dataportal"
                ? $_("tools.layerLibrary.dataportal")
                : group.title;

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
            <div class="group-title" title={displayTitle}>
                {displayTitle}
            </div>
            {#if group.toolGroup}
                <span class="tool-group-icon" title={$_('tools.layerLibrary.toolGroupTooltip', { values: { tool: $_(group.toolGroup.label) } })}>
                    <Tools size={16} />
                </span>
            {/if}
            {#if group.connector.type && group.connector.url}
                <a class="connector-tag" href="{group.connector.url}" title="{$_('general.goTo') + ' ' + group.connector.type}" target="_blank">
                    <Tag type="green" size="sm" interactive="{true}">
                        {group.connector.type}
                    </Tag>
                </a>
            {/if}
            <div class="group-menu" title={$_("tools.layerLibrary.addRemoveAllTooltip")}>
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
                                <svelte:self group={child} {library} {textBaselayers} {textNoCategory} />
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
        min-width: 0;
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

    .group-content-wrapper {
        position: relative;
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
        padding-top: 2px;
        flex-grow: 1;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
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

    .tool-group-icon {
        display: flex;
        align-items: center;
        margin-right: var(--cds-spacing-02);
        color: var(--cds-icon-02, var(--cds-text-02));
        cursor: help;
    }

    .connector-tag {
        flex-shrink: 0;
    }

    .connector-tag :global(.bx--tag__label) {
        cursor: pointer;
        word-break: normal;
    }
</style>
