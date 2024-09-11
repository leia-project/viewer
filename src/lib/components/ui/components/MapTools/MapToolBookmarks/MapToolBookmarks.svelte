<script lang="ts">
    import { getContext } from "svelte";
    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";
    import { CameraLocation } from "$lib/components/map-core/camera-location";

    import { TextInput, TextArea, Button, InlineNotification } from "carbon-components-svelte";
    import Bookmark from "carbon-icons-svelte/lib/Bookmark.svelte";
    import Edit from "carbon-icons-svelte/lib/Edit.svelte";
    import Save from "carbon-icons-svelte/lib/Save.svelte";
    import Close from "carbon-icons-svelte/lib/Close.svelte";
    import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
    import Add from "carbon-icons-svelte/lib/Add.svelte";

    const { registerTool, selectedTool, map } = getContext<any>("mapTools");

    let id: string = "bookmarks";
    export let icon: any = Bookmark;
    export let label: string = "Bookmarks";
    export let bookmarks: Array<CameraLocation> = new Array<CameraLocation>();
    export let textTitle: string = "Title";
    export let textDescription: string = "Description";
    export let textSave: string = "Save";
    export let textCancel: string = "Cancel";
    export let textDelete: string = "Delete";
    export let textAdd: string = "Add New Bookmark";
    export let textNoBookmarks: string = "No bookmarks";
    export let textNoBookmarksSubtitle: string = "Press the add button to add a new bookmark";
    export let textInfoCameraPosition = "Camera";
    export let textInfoCameraPositionSubtitle = "The current camera view will be stored as bookmark location";


    let tool = new MapToolMenuOption(id, icon, label);
    $: { tool.label.set(label); }

    let editting: number = -1;
    let edittingTitle: string;
    let edittingDescription: string;
    const storageLocation = "tosti.bookmark.bookmarks";

    tool.settings.subscribe((settings) => {
        if (settings) {
            loadBookmarksFromSettings(settings);
        }
    });

    map.ready.subscribe((r: any) => {
        if (r) {
            loadFromLocalStorage();
        }
    });

    registerTool(tool);

    function loadBookmarksFromSettings(settings: any) {
        const configBookmarks = settings.bookmarks;
        if (configBookmarks) {
            const newBookmarks = new Array<CameraLocation>();

            for (let i = 0; i < configBookmarks.length; i++) {
                const p = configBookmarks[i];
                const position = new CameraLocation(p.x, p.y, p.z, p.heading, p.pitch, p.duration, p.title, p.description, false);
                newBookmarks.push(position);
            }

            bookmarks.unshift(...newBookmarks);
            bookmarks = [...bookmarks];
        }
    }

    function startEdit(index: number) {
        if (index === editting) {
            cancelEdit();
            return;
        }

        editting = index;
        edittingTitle = bookmarks[editting].title;
        edittingDescription = bookmarks[editting].description;
    }

    function cancelEdit() {
        editting = -1;
    }

    function saveBookmark() {
        let position: CameraLocation = new CameraLocation(0, 0, 0);

        try {
            position = map.getPosition();
        } catch {}

        position.title = edittingTitle ?? "Bookmark";
        position.description = edittingDescription;
        bookmarks[editting] = position;
        cancelEdit();
        bookmarks = [...bookmarks];
        saveLocal();
    }

    function deleteBookmark() {
        bookmarks.splice(editting, 1);
        bookmarks = [...bookmarks];
        cancelEdit();
        saveLocal();
    }

    function addBookmark() {
        let position: CameraLocation = new CameraLocation(0, 0, 0);

        try {
            position = map.getPosition();
        } catch {
            console.error("Unable to get map position");
            return;
        }

        position.editable = true;
        bookmarks = [...bookmarks, position];
        startEdit(bookmarks.length - 1);
    }

    function zoomTo(position: CameraLocation) {
        map.flyTo(position);
    }

    function saveLocal() {
        const tempBookmarks = bookmarks;
        const bookmarkObjects = new Array<any>();
        for (let i = 0; i < tempBookmarks.length; i++) {
            if (tempBookmarks[i].editable === true) {
                bookmarkObjects.push(tempBookmarks[i]);
            }
        }

        localStorage.setItem(storageLocation, JSON.stringify(bookmarkObjects));
    }

    function loadFromLocalStorage() {
        const localStorageItems = localStorage.getItem(storageLocation);
        if (localStorageItems) {
            const objects = JSON.parse(localStorageItems);
            const newBookmarks = new Array<CameraLocation>();
            for (let i = 0; i < objects.length; i++) {
                const bm = objects[i];
                const newBookmark = new CameraLocation(
                    bm["x"],
                    bm["y"],
                    bm["z"],
                    bm["heading"],
                    bm["pitch"],
                    bm["duration"],
                    bm["title"],
                    bm["description"],
                    true
                );
                newBookmarks.push(bm);
            }

            bookmarks.push(...newBookmarks);
            bookmarks = [...bookmarks];
        }
    }
</script>

{#if $selectedTool === tool}
    <div class="wrapper">
        {#if bookmarks.length == 0}
        <div class="notification">
            <InlineNotification lowContrast hideCloseButton kind="info" title={textNoBookmarks} subtitle={textNoBookmarksSubtitle} />
        </div>
        {:else}
            {#each bookmarks as bookmark, i}
                <div class="bookmark">
                    {#if i === editting}
                        <div class="bookmark-content">
                            <TextInput labelText={textTitle} placeholder={textTitle} bind:value={edittingTitle} />
                            <TextArea labelText={textDescription} bind:value={edittingDescription} />
                            <InlineNotification
                                lowContrast
                                hideCloseButton
                                kind="info"
                                title={textInfoCameraPosition}
                                subtitle={textInfoCameraPositionSubtitle}
                            />
                            <div class="bookmark-content-buttons">
                                <div class="left">
                                    <Button
                                        kind="danger"
                                        disabled={bookmark.editable === false}
                                        on:click={() => {
                                            deleteBookmark();
                                        }}
                                        iconDescription={textDelete}
                                        icon={TrashCan}
                                    />
                                </div>

                                <div class="right">
                                    <Button
                                        on:click={() => {
                                            cancelEdit();
                                        }}
                                        iconDescription={textCancel}
                                        icon={Close}
                                    />
                                    <Button
                                        disabled={bookmark.editable === false}
                                        on:click={() => {
                                            saveBookmark();
                                        }}
                                        iconDescription={textSave}
                                        icon={Save}
                                    />
                                </div>
                            </div>
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class=" bookmark-header"
                            on:click={() => {
                                zoomTo(bookmarks[i]);
                            }}
                            role="button"
                            tabindex="0"
                        >
                        
                            <div class="bookmark-text" >
                                <div class="label-02">
                                    {bookmark.title}
                                </div>
                                {#if bookmark.description}
                                    <div class="label-01">
                                        {bookmark.description}
                                    </div>
                                {/if}
                            </div>

                            <div class="bookmark-edit">
                                <Button
                                    iconDescription="Edit"
                                    icon={Edit}
                                    kind="ghost"
                                    on:click={() => {
                                        startEdit(i);
                                    }}
                                />
                            </div>
                        </div>
                    {/if}
                </div>
                <div class="divider" />
            {/each}
        {/if}
        <div class="add">
            <Button
                on:click={() => {
                    addBookmark();
                }}
                iconDescription={textAdd}
                icon={Add}
                tooltipPosition="left"
                tooltipAlignment="end"
            />
        </div>
    </div>

{/if}

<style>
    .wrapper {
        width: 100%;
        
    }

    .bookmark {
        width: 100%;
    }

    .bookmark-header {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-content: center;
    }

    .divider {
        background-color: var(--cds-ui-03);
        width: 100%;
        height: 1px;
    }

    .notification {
        padding: var(--cds-spacing-05);
    }

    .bookmark-content {
        width: 100%;
        display: flex;
        flex-direction: column;
        row-gap: var(--cds-spacing-03);
        padding: var(--cds-spacing-05);
    }

    .bookmark-text {
        flex-grow: 1;
        min-height: 50px;
        padding-top: var(--cds-spacing-03);
        padding-bottom: var(--cds-spacing-03);
        padding-left: var(--cds-spacing-05);
    }

    .bookmark-text:hover {
        background-color: var(--cds-ui-01);
        color: var(--tosti-color-text-secondary);
        transition: 0.2s;
    }

    .bookmark-edit {
        height: 100% !important;
    }

    .bookmark-content-buttons {
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding-top: var(--cds-spacing-05);
        gap: var(--cds-spacing-01);
    }

    .add {
        padding-top: var(--cds-spacing-05);
        padding-right: var(--cds-spacing-05);
        width: 100%;
        display: flex;
        justify-content: end;
    }
</style>
