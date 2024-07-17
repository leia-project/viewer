<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { DataTable, DataTableSkeleton, Modal, Toolbar, ToolbarContent, ToolbarSearch } from "carbon-components-svelte";
    import Close from "carbon-icons-svelte/lib/Close.svelte";
    import Popup from "carbon-icons-svelte/lib/Popup.svelte";
    import { fade } from "svelte/transition";

    import type { MapCore } from "$lib/components/map-core/map-core";
    import type { FeatureInfoResults } from "$lib/components/map-core/FeatureInfo/feature-info-results";
    import { ComposedRow } from "../../../models/ComposedRow";
    import { ComposedFeatureInfoResult } from "../../../models/ComposedFeatureInfoResult";
    import Button from "../../Button/Button.svelte";
    // import ZoomImg from "@svelte-parts/zoom";
    //@ts-ignore
    import {plot, line} from "@observablehq/plot";

    export let map: MapCore;
    export let featureInfoResults: FeatureInfoResults = map.featureInfo;
    export let label: string = "Feature Info";
    export let linkFields: Array<{field: string, handler: string}> | undefined;
    //export let textNoData: string = "No Data, Click on the map to request Feature Info";

    const dispatch = createEventDispatcher();

    let handlerOpen = false;
    let handler: any | undefined;
    let handlerData: any | undefined;
    let handlerModal: any;
    let handlerModalTitle: string;

    let modalOpen = false;
    let modalRows = new Array<ComposedRow>();
    let modalTitle = "";
    let show = false;

    let headers = [
        { key: "attribute", value: "Attribute", width: "120px"},
        { key: "value", value: "Value" }
    ];
    let headersModal = [
        { key: "attribute", value: "Attribute", width: "180px" },
        { key: "value", value: "Value" }
    ];
    let loading = featureInfoResults.loading;
    let results = new Array<ComposedFeatureInfoResult>();

    $: {
        if (!handlerOpen) {
            handler = undefined;
            handlerData = undefined;
        }
    }

    $: linkFieldNames = linkFields ? linkFields.map((f: { field: string; }) => {
        return f.field.toLowerCase();
    }) : undefined;

    const unsubscribeFiResults = featureInfoResults.results.subscribe((r) => {
        const tempResults = new Array<ComposedFeatureInfoResult>();
        if (!r) {
            results = tempResults;
            return;
        }

        for (let i = 0; i < r.length; i++) {
            if (r[i].records) {
                const result = new ComposedFeatureInfoResult(r[i].title);

                for (let j = 0; j < r[i].records.length; j++) {
                    result.rows.push(new ComposedRow(j.toString(), r[i].records[j].title, r[i].records[j].value));
                }
                tempResults.push(result);
            }
        }

        results = tempResults;
    });

    function removeFromView() {
        show = false;
        setTimeout(function () {
            dispatch("remove");
        }, 200);
    }

    onMount(async () => {
        show = true;
    });

    onDestroy(() => {        
        unsubscribeFiResults();
        featureInfoResults.clear();
    });

    function openHandler(field: string, value: string) {
        const fieldConfig = linkFields?.find((f) => {
            return f.field.toLowerCase() === field;
        });
        if (!fieldConfig) return;

        handler = fieldConfig.handler.toLowerCase();
        handlerModalTitle = field.charAt(0).toUpperCase() + field.slice(1);
        handlerData = value;
        handlerOpen = true;
    }

    function createTimeSeriesChart(node: HTMLElement, data: Array<{x: string, y: number}>) {
        // data: [{x: datestring, y: value}, {x: datestring, y: value}, ...]
        const y_input = Object.keys(data[0])[1];
        let myPlot = plot({
            marks: [
                line(data, {
                    x: (n: {x: string, y: number}) => new Date(n.x),
                    //@ts-ignore
                    y: n => parseFloat(n[y_input]),
                    strokeWidth: 1
                })
            ],
            y: {
                label: y_input,
                labelAnchor: "center",
                grid: true,
                labelOffset: 40
            },
            line: true,
            insetTop: 15,
            insetBottom: 30,
            style: {
                padding: 10
            }
        });
        node.appendChild(myPlot);
    }
</script>

{#if show && results.length > 0}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="fiView"
        in:fade={{ delay: 0, duration: 150 }}
        out:fade={{ delay: 0, duration: 150 }}
        on:click={(e) => {
            e.preventDefault(), e.stopImmediatePropagation();
        }}
        role="button"
        tabindex="0"
    >
        <div class="close">
            <Button
                kind="ghost"
                icon={Close}
                size="small"
                on:click={(e) => {
                    e.preventDefault(), e.stopImmediatePropagation();
                    removeFromView();
                }}
            />
        </div>

        <div class="heading-01">
            {#if !$loading && results && results.length === 1}
                {results[0].label}
            {:else}
                {label}
            {/if}
        </div>

        <div class="content">
            {#if $loading}
                <div>
                    <DataTableSkeleton
                        showHeader={false}
                        showToolbar={false}
                        size="short"
                        headers={[{ value: "Attribute" }, { value: "Value" }]}
                        rows={4}
                    />
                </div>
            <!--{:else if !results || results.length === 0}
                <div class="nodata">
                    {textNoData}
                </div>-->
            {:else}
                <div class="fi result-wrapper">
                    {#each results as entry, i}
                        {#if results.length > 1}
                            <div class="result-heading label-02">
                                <div>
                                    {entry.label}
                                </div>
                            </div>
                        {/if}

                        <div class="fi-table" class:not-bottom={i !== results.length - 1}>
                            <DataTable size="compact" {headers} rows={entry.rows}>
                                <svelte:fragment slot="cell" let:row let:cell>
                                    {#if linkFieldNames && cell.key === "value" && linkFieldNames.includes(row.attribute.toLowerCase())}
                                        <div class="row">
                                            <div class="open-handler" 
                                                role="button" 
                                                tabindex="0"
                                                on:click={() => {
                                                    openHandler(row.attribute.toLowerCase(), cell.value);
                                                }}
                                            >
                                                Open
                                            </div>
                                        </div>
                                    {:else if cell.value?.toString().startsWith("href") && cell.value.length > 8}
                                        <div class="row">
                                            <a href="{cell.value.substring(5)}" class="open-handler" on:click={(e) => (e.target instanceof HTMLAnchorElement) ? window.open(e.target.href, '_blank') : ""} role="button" tabindex="0">Link</a>
                                        </div>
                                    {:else}
                                        <div class="row">
                                            {@html cell.value}
                                        </div>
                                    {/if}
                                </svelte:fragment>
                            </DataTable>

                            <div
                                class="table-header"
                                on:click={(c) => {
                                    modalRows = entry.rows;
                                    modalTitle = entry.label;
                                    modalOpen = true;
                                }}
                                role="button"
                                tabindex="0"
                            >
                                <div>
                                    <Popup />
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <Modal
            size="lg"
            bind:this={handlerModal}
            hasScrollingContent
            preventCloseOnClickOutside
            passiveModal
            bind:open={handlerOpen}
            modalHeading={handlerModalTitle}
            on:open
            on:close
        >
            {#if handler === "image"}
                <div class="image-zoom">
                    <div class="title body-compact-01">
                        <!-- svelte-ignore security-anchor-rel-noreferrer -->
                        <a href={handlerData} target="_blank">{handlerData}</a>
                    </div>
                    <div class="zoom-img">
                        <img src={handlerData} alt="" width={"100%"} />
                    </div>
                </div>
            {/if}

            {#if handler === "pdf"}
                <div class="image-zoom">
                    <div class="title body-compact-01">
                        <!-- svelte-ignore security-anchor-rel-noreferrer -->
                        <a href={handlerData} target="_blank">{handlerData}</a>
                    </div>

                    <object title="" width="100%" height="1000" data={handlerData} type="application/pdf">
                        <div>No online PDF viewer installed</div>
                    </object>
                </div>
            {/if}

            {#if handler === "chart"}
                <div class="image-zoom">
                    <div class="title body-compact-01">
                        <div class="feature-info-chart" use:createTimeSeriesChart={handlerData}></div>
                    </div>
                </div>
            {/if}
        </Modal>

        <Modal passiveModal hasScrollingContent bind:open={modalOpen} modalHeading={modalTitle} on:open on:close>
            <div class="fi-table" >
            <DataTable sortable zebra size="medium" headers={headersModal} rows={modalRows}>
                <Toolbar>
                    <ToolbarContent>
                        <ToolbarSearch persistent value="" shouldFilterRows />
                    </ToolbarContent>
                </Toolbar>
                <svelte:fragment slot="cell" let:row let:cell>
                    <div class="row-modal">
                        {cell.value}
                    </div>
                </svelte:fragment>
            </DataTable>
        </div>
        </Modal>
    </div>
{/if}

<style>
    .fiView {
        min-width: 200px;
        max-width: 400px;
        max-height: 60%;
        display: flex;
        flex-direction: column;
        background-color: var(--cds-ui-02);
        position: absolute;
        bottom: var(--cds-spacing-05);
        left: var(--cds-spacing-05);
        padding: var(--cds-spacing-05);
        border: 1px solid var(--cds-ui-03);
        overflow: hidden;
    }

    .close {
        position: absolute;
        top: 0;
        right: 0;
    }

    .open-handler {
        cursor: pointer;
        color: var(--cds-interactive-01);
    }

    .fiView > div {
        flex: 0 0 auto;
    }
    .fiView > div.content {
        flex: 0 1 auto;
        overflow: auto;
    }

    .content {
        display: flex;
        gap: var(--cds-spacing-05);
        transition: width 1s ease-in-out;
    }

    .result-wrapper {
        width: 100%;
    }

    .result-heading {
        width: 100%;
        padding-bottom: var(--cds-spacing-03);
    }

    /*
    .nodata {
        font-size: var(--tosti-font-size-normal);
        font-weight: var(--tosti-font-weight-normal);
    }
    */

    .not-bottom {
        margin-bottom: var(--cds-spacing-05);
    }

    :global(.fi-table .bx--data-table) {
        table-layout: fixed;
    }

    :global(.fi-table .bx--data-table td) {
        vertical-align: top;
    }

    .fi-table {
        position: relative;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
    }

    .table-header {
        position: absolute;
        display: flex;
        justify-content: right;
        width: 100%;
        right: 6px;
        top: 6px;
        cursor: pointer;
    }

    .row {
        overflow-wrap: break-word;
        font-size: var(--tosti-font-size-small);
    }

    .row-modal {
        overflow-wrap: break-word;
    }

    .image-zoom {
        position: relative;
        padding: var(--cds-spacing-05);
    }

    .image-zoom .title {
        padding-bottom: var(--cds-spacing-05);
    }

    .zoom-img {
        background-color: var(--cds-ui-02);
        border: 1px solid var(--cds-ui-03);
    }

    .feature-info-chart {
       display: flex;
       justify-content: center;
    }
</style>
