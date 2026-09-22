<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Tabs, Tab, TabContent, InlineNotification, SkeletonPlaceholder } from "carbon-components-svelte";

    import { getBroObject } from "$lib/bro/bro-api";
    import Button from "$lib/components/theme/Button/Button.svelte";
    import BroGraph from "./BroGraph.svelte";
    import BroData from "./BroData.svelte";

    export let broId: string;

    let requestedBroId: string;
    let objectPromise: ReturnType<typeof getBroObject>;

    $: if (broId !== requestedBroId) {
        requestedBroId = broId;
        objectPromise = getBroObject(broId);
    }

    function retry() {
        objectPromise = getBroObject(broId);
    }
</script>

<div class="bro-detail">
    {#await objectPromise}
        <SkeletonPlaceholder style="width: 100%; height: 300px;" />
    {:then object}
        <Tabs>
            <Tab label={$_("tools.featureInfo.bro.graphTab")} />
            <Tab label={$_("tools.featureInfo.bro.dataTab")} />
            <svelte:fragment slot="content">
                <TabContent>
                    <BroGraph {broId} type={object.type} />
                </TabContent>
                <TabContent>
                    <BroData {object} />
                </TabContent>
            </svelte:fragment>
        </Tabs>
    {:catch error}
        <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={$_("tools.featureInfo.bro.loadError")}
            subtitle={error.message}
        />
        <div class="error-actions">
            <Button kind="tertiary" size="small" on:click={retry}>{$_("tools.featureInfo.bro.retry")}</Button>
        </div>
    {/await}

</div>

<style>
    .bro-detail {
        min-height: 300px;
    }

    .error-actions {
        margin-top: var(--cds-spacing-05);
    }

</style>
