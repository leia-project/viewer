<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { get, writable } from "svelte/store";
    import { _ } from "svelte-i18n";
    import { Modal, Search, ContentSwitcher, Switch, InlineNotification, Button, MultiSelect, Tag } from "carbon-components-svelte";
    import Add from "carbon-icons-svelte/lib/Add.svelte";
    import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
    import fuzzysort from "fuzzysort";

    import type { LayerConfig } from "$lib/components/map-core/layer-config";
    import type { LayerLibrary } from "$lib/components/map-core/layer-library";
    import type { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";

    import LayerConfigGroups from "./LayerConfigGroups.svelte";
    import LibraryLayer from "./LibraryLayer.svelte";
    import LibraryLayerInfo from "./LibraryLayerInfo.svelte";
    import CustomLibraryLayerInfo from "./CustomLayers/CustomLibraryLayerInfo.svelte";
    import { CustomLayerConfigTracker } from "./CustomLayers/custom-layer-config";
    import CustomLibraryLayer from "./CustomLayers/CustomLibraryLayer.svelte";


    export let txtTitle: string;
    export let txtClose: string;
    export let library: LayerLibrary;
    export let useTags: Boolean;

    const groups = library.groups;
    const selectedLayerConfig = library.selectedLayerConfig;
    $: path = $selectedLayerConfig ? findPath($selectedLayerConfig.groupId, "") : "";

    const selectedCustomLayer = writable<CustomLayerConfigTracker | undefined>(undefined);
    const mylayers = $groups.find((g) => { if(g.id === "myData") return g })?.layerConfigs;
    const customlayers = $mylayers?.map((l) => new CustomLayerConfigTracker(l));
    $: myDataLayers = writable(customlayers);


    function convertTags(tags:Array<string>): Array<{ id: number; text: string }> {
        let result: Array<{ id: number; text: string }> = [];
        for (let i=0; i<tags.length; i++) {
            result.push({id: i, text: tags[i]});
        }
        return result;
    }

    $: libTags = useTags ? convertTags(get(library.tags)) : [];

    function getSelectedTagNames(): Array<string> {
        let tagIDs = get(selectedTagIDs);
        let newSelectedTagNames: Array<string> = new Array();
        if (libTags) {
            for (let i=0; i<libTags.length; i++) {
                if (tagIDs.includes(libTags[i]['id'])) {
                    newSelectedTagNames.push(libTags[i]["text"]);
                }
            }
        }
        return newSelectedTagNames;
    }

    const dispatch = createEventDispatcher();    
    let contentIndex = 0;
    let searchString = writable<string>("");
    let searchableList: Array<{ key: string; value: LayerConfig }> = new Array<{ key: string; value: LayerConfig }>();
    let searchResults: Array<LayerConfig> = new Array<LayerConfig>();
    let selectedTagIDs = writable<number[]>([]);
    let selectedTagNames: string[] = [];
    
    function searchAndFilter(): void {
        let searchStr = get(searchString);
        if (!searchStr && !get(selectedTagIDs)) {
            searchableList = new Array<{ key: string; value: LayerConfig }>();
            searchResults = new Array<LayerConfig>();
            return;
        }

        if (searchableList.length === 0) {
            searchableList = getFlatList();
        }

        let results = new Array<LayerConfig>();
        const fuzzy = fuzzysort.go(searchStr, searchableList, { key: "key" });
        for (let i = 0; i < fuzzy.length; i++) {
            results.push(fuzzy[i].obj.value);
        }

        selectedTagNames = getSelectedTagNames();
        if (selectedTagNames.length === 0) {
            searchResults = results;
            return;
        }
        
        // If no tags are selected then the below is not run
        if (!searchStr) {
            for (let i = 0; i < searchableList.length; i++) {
                results.push(searchableList[i].value);
            }
        }
        let filteredLayers: Array<LayerConfig> = [];
        for (let i=0; i<results.length; i++) {
            let layerTags = results[i].tags;
            let layerTagNames: Array<string> = [];
            if (layerTags) {
                for (let x=0; x<layerTags.length; x++) {
                    layerTagNames.push(layerTags[x]);
                }
                for (let x=0; x<layerTagNames.length; x++) {
                    if (selectedTagNames.includes(layerTagNames[x])) {
                        filteredLayers.push(results[i]);
                        x = layerTagNames.length;
                    }
                }
            }
        }
        searchResults = filteredLayers;
    }

    function getFlatList(): Array<{ key: string; value: LayerConfig }> {
        const layers = new Array<LayerConfig>();
        const groups = get(library.groups);

        for (let i = 0; i < groups.length; i++) {
            const g = groups[i];
            recursiveAdd(g, layers);
        }

        return layers.map((l) => ({ key: l.title.toLowerCase(), value: l }));
    }

    searchString.subscribe(() => {
        searchAndFilter();
    });
    selectedTagIDs.subscribe(() => {
        searchAndFilter();
    });

    function resetFilter(): void {
        selectedTagIDs.set([]);
    }

    function recursiveAdd(group: LayerConfigGroup, layers: Array<LayerConfig>): void {
        const configs = get(group.layerConfigs);
        if (configs) {
            for (let j = 0; j < configs.length; j++) {
                const c = configs[j];
                layers.push(c);
            }
        }

        const childGroups = get(group.childGroups);
        if (childGroups) {
            for (let i = 0; i < childGroups.length; i++) {
                recursiveAdd(childGroups[i], layers);
            }
        }
    }

    function removeFromView(e: any) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        dispatch("remove");
    }

    function findPath(groupId: string, path: string): string { // Does not work for CKAN Layers; parentId === undefined; update map-core to add group parentId to CKAN layers
        if (groupId) {
            const g = library.findGroup(groupId);
            if (g) {
                path = `${g.title}/${path}`;
                if (g.parentId) {
                    path = findPath(g.parentId, path);
                }
            }
        }

        return path;
    }

    document.addEventListener("focus", (e) => {
        if (e && e.target) {
            const element = e.target as HTMLInputElement;
            if (element.id.includes("bx--modal-body--")) {
                (e.target as HTMLElement).blur();
            }
        }
    }, true);


    function addNewCustomLayer(): void {
        const newConfig = new CustomLayerConfigTracker();
        $myDataLayers.push(newConfig);
        myDataLayers.set($myDataLayers);
        library.addLayerConfig(newConfig.layerConfig);
    }


    function deleteLayerFromLibrary(customLayerConfigTracker: CustomLayerConfigTracker): void {
        const layerConfig = customLayerConfigTracker.layerConfig;
        if ($selectedCustomLayer?.layerConfig === layerConfig) selectedCustomLayer.set(undefined);
        customLayerConfigTracker.destroy();
        library.removeLayerConfig(layerConfig);
        $myDataLayers = $myDataLayers.filter((l) => l !== customLayerConfigTracker);
        dispatch("updateLocalStorage");
    }


    onDestroy(() => {
        for (const layer of $myDataLayers) {
            layer.destroy();
        }
    });

</script>

<!-- Wrap in div with class libary for global css only applying to this specific modal-->
<div class="library">
    <Modal
        size="lg"
        passiveModal
        hasScrollingContent
        open={true}
        modalHeading={txtTitle}
        primaryButtonText={txtClose}
        on:click:button--secondary={(e) => {
            removeFromView(e);
        }}
        on:open
        on:close={(e) => {
            removeFromView(e);
        }}
        on:submit={(e) => {
            removeFromView(e);
        }}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- prevent leaking click to the map -->
        <div
            class="wrapper"
            on:click={(e) => {
                e.stopImmediatePropagation();
            }}
            role="button"
            tabindex="0"
        >
            <div class="menu">
                <div class="switcher">
                    <ContentSwitcher size="sm" bind:selectedIndex={contentIndex}>
                        <Switch text={$_("tools.layerLibrary.catalogue")} />
                        <Switch text={$_("tools.layerLibrary.myData")} />
                    </ContentSwitcher>
                </div>

                {#if contentIndex === 0}
                    <div class="groups">
                        {#if selectedTagNames.length > 0 }
                            <div class="heading-01">{$_("tools.layerLibrary.selectedThemes")}:
                                {#each selectedTagNames as tagName }
                                    <Tag type="high-contrast">{tagName}</Tag>
                                {/each}
                            </div>
                            <div id='reset-filter-button'>
                                <Button 
                                    kind="tertiary" 
                                    icon={TrashCan} 
                                    size="small"
                                    on:click={resetFilter}
                                >Reset filter</Button>
                            </div>
                        {/if}
                        {#if $searchString }
                            <div class="heading-01">{$_("tools.layerLibrary.searchResults")} {$_("tools.layerLibrary.for")} {$searchString}</div>
                        {/if}
                        {#if $searchString || $selectedTagIDs.length > 0 }
                            {#if searchResults.length > 0}
                                {#each searchResults as config}
                                    <div>
                                        <LibraryLayer {config} {library} />
                                    </div>
                                {/each}
                            {:else}
                                {$_("tools.layerLibrary.searchNoResults")}: {$searchString}
                            {/if}
                        {:else}
                            <LayerConfigGroups {library} />
                        {/if}
                    </div>             
                           
                    {#if useTags === true }
                    <div id="tag-filter">
                        <MultiSelect
                            direction="top"
                            spellcheck="false"
                            filterable
                            titleText=""
                            placeholder={`${$_("tools.layerLibrary.filterByTheme")}...`}
                            items={libTags}
                            bind:selectedIds={$selectedTagIDs}
                            />
                    </div>
                    {/if}
                    <div class="search">
                        <Search size="sm" light placeholder={$_("tools.layerLibrary.searchPlaceholder")} bind:value={$searchString} />
                    </div>
                {/if}

                {#if contentIndex === 1}
                    <div class="groups">
                        {#if myDataLayers}
                            {#each $myDataLayers as customConfig}
                                <CustomLibraryLayer 
                                    {customConfig} 
                                    {selectedCustomLayer}
                                    on:updateLocalStorage={() => dispatch("updateLocalStorage")}
                                />
                            {/each}
                        {/if}
                        <div class="my-data-add-button">
                            <Button 
                                icon={Add} 
                                size="small"
                                on:click={addNewCustomLayer}
                            >{$_("tools.layerLibrary.addCustomLayer")}</Button>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="content">
                {#if contentIndex === 0}
                    {#if $selectedLayerConfig}
                        <LibraryLayerInfo layerConfig={selectedLayerConfig} {path} />
                    {:else}
                        <div>
                            <InlineNotification
                                kind="info"
                                title={$_("tools.layerLibrary.info")}
                                hideCloseButton
                                lowContrast
                                subtitle={$_("tools.layerLibrary.infoLibrary")}
                                on:close={(e) => {
                                    e.preventDefault();
                                    // custom close logic (e.g., transitions)
                                }}
                            />
                        </div>
                    {/if}
                {/if}

                {#if contentIndex === 1}
                    {#if $selectedCustomLayer}
                        <CustomLibraryLayerInfo 
                            custom={$selectedCustomLayer}
                            on:deleteLayer={(e) => deleteLayerFromLibrary(e.detail)}
                        />
                    {:else}
                        <div>
                            <InlineNotification
                                kind="info"
                                title={$_("tools.layerLibrary.info")}
                                hideCloseButton
                                lowContrast
                                subtitle={$_("tools.layerLibrary.infoMyDataLibrary")}
                                on:close={(e) => {
                                    e.preventDefault();
                                    // custom close logic (e.g., transitions)
                                }}
                            />
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </Modal>
</div>

<style>
    .wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: stretch;
    }

    .menu {
        min-width: 27rem;
        max-width: 27rem;
        height: 100%;
        background-color: var(--cds-ui-0);
        padding: var(--cds-spacing-05) var(--cds-spacing-05) 0 var(--cds-spacing-05);
        display: flex;
        flex-direction: column;
    }

    .switcher {
        margin-bottom: var(--cds-spacing-05);
    }

    .groups {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        margin-bottom: var(--cds-spacing-05);
    }

    .my-data-add-button {
        margin-top: 30px;
    }

    .content {
        flex-grow: 1;
        height: 100%;
        width: 100%;
        background-color: var(--cds-ui-02);
        padding: var(--cds-spacing-05);
        display: flex;
        justify-content: center;
    }
    #tag-filter, #reset-filter-button {
        margin-bottom: 10px;
    }

    :global(.library .bx--modal-content bx--modal-scroll-content:focus) {
        background-color: hotpink;
    }

    :global(.library .bx--modal-container--lg) {
        min-height: 85%;
        max-height: 85%;
        min-width: 75%;
        max-width: 75%;
    }

    :global(.library .bx--modal-content) {
        margin-bottom: 0;
        padding: 0;
        padding-bottom: var(--cds-spacing-05);
        padding-right: var(--cds-spacing-05);
    }

    :global(.library .bx--modal-scroll-content > *:last-child) {
        padding: 0;
    }
</style>
