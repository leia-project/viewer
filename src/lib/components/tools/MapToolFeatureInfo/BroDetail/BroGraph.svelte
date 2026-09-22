<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Dropdown, InlineLoading, InlineNotification } from "carbon-components-svelte";

    import { getGraphSvgUrl, getCptGraphTypes, DEFAULT_CPT_GRAPH_TYPE, type BroObjectType } from "$lib/bro/bro-api";

    export let broId: string;
    export let type: BroObjectType;

    let graphType = DEFAULT_CPT_GRAPH_TYPE;

    $: svgPromise = getGraphSvgUrl(broId, type === "cpt" ? graphType : undefined);
    $: graphTypesPromise = type === "cpt" ? getCptGraphTypes() : undefined;
</script>

<div class="bro-graph">
    {#if type === "cpt"}
        {#await graphTypesPromise then graphTypes}
            <div class="graph-type">
                <Dropdown
                    titleText={$_("tools.featureInfo.bro.graphType")}
                    size="sm"
                    bind:selectedId={graphType}
                    items={(graphTypes ?? []).map((g) => ({ id: g.graphType, text: g.name }))}
                />
            </div>
        {:catch}
            <!-- graph type list unavailable: keep showing the default graph -->
        {/await}
    {/if}

    {#await svgPromise}
        <InlineLoading description={$_("tools.featureInfo.bro.loading")} />
    {:then svgUrl}
        <div class="graph-container">
            <img src={svgUrl} alt={broId} />
        </div>
    {:catch error}
        <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={$_("tools.featureInfo.bro.graphError")}
            subtitle={error.message}
        />
    {/await}
</div>

<style>
    .graph-type {
        max-width: 320px;
        margin-bottom: var(--cds-spacing-05);
    }

    .graph-container {
        background-color: #ffffff;
        border: 1px solid var(--cds-ui-03);
        overflow: auto;
    }

    .graph-container img {
        display: block;
        width: 100%;
        height: auto;
    }
</style>
