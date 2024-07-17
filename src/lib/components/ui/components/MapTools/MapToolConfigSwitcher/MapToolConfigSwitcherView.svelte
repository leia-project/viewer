<script lang="ts">
    import { createEventDispatcher, getContext } from "svelte";
    import { Modal } from "carbon-components-svelte";
    import { _ } from "svelte-i18n";
	import ConfigCard from "$lib/components/ui/components/ConfigCard/ConfigCard.svelte";
	import ErrorMessage from "$lib/components/ui/components/ErrorMessage/ErrorMessage.svelte";

    export let txtTitle: string;
    export let txtIntro: string;
    export let configs: Array<any> = new Array<any>();

    let selectedTab = 0;
    const dispatch = createEventDispatcher();

    function removeFromView(e: any): void {
        handleE(e);
        dispatch("remove");
    }

    function handleE(e: any): void {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    function changeConfig(configUrl: string): void {
        dispatch("change", {configUrl: configUrl});
    }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<help>
    
    <Modal
        open={true}
        modalHeading={txtTitle}
        primaryButtonText="{$_("tools.config_switcher.close")}"
        style="margin-bottom: 0"
        on:open
        on:close={(e) => {
            removeFromView(e);
        }}
        on:submit={(e) => {
            removeFromView(e);
        }}
    >
        <div class="wrapper">
            <div class="content">
                <div>
                    <p>{txtIntro}</p>
                </div>
                <div class="card-wrapper">
                    {#if configs.length === 0}
                        <ErrorMessage message="{$_("tools.config_switcher.no_configs")}"/>
                    {/if}
                    {#each configs as config}
                        <ConfigCard 
                            header={config.title}
                            thumbnail={config.thumbnail}
                            on:click={() => changeConfig(config.url)}
                        />
                    {/each}
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

    .card-wrapper {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        width: 100%;
        margin: 10px 0;
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

    :global(a:hover[role=tab]) {
        text-decoration: none;
    }
</style>
