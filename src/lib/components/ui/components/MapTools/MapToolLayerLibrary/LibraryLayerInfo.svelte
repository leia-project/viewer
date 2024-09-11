<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Button } from "carbon-components-svelte";
    import { ContentSwitcher, Switch } from "carbon-components-svelte";
    import { Tag } from "carbon-components-svelte";

    import type { Writable } from "svelte/store";
    import type { LayerConfig } from "$lib/components/map-core/layer-config";
    import { Metadata } from "./metadata";

    export let layerConfig: Writable<LayerConfig>;
    export let path: string = "";

    let contentIndex = 0;
    $: config = $layerConfig;
    $: metadata = config.metadata;
    $: metadataUrl = config.metadataUrl;  //"https://nationaalgeoregister.nl/geonetwork/srv/api/records/1ad6e0e0-8684-4a63-afe0-df1089072653/formatters/xml?approved=true";
    $: metadataLink = config.metadataLink;
    $: metadataLinkShort = metadataLink ? metadataLink.split("/").pop() : "";
    $: attribution = config.attribution;
    $: addedToLayerManager = config.added;
    $: imageUrl = config.imageUrl;
    $: type = config.type;
    $: settings = syntaxHighlight("\n" + getJsonLayerConfig(config));

    layerConfig.subscribe(() => {
        contentIndex = 0;
    });

    const standardMetadata = new Metadata();
    $: { standardMetadata.parseMetadataUrl(metadataUrl) }
    $: mdEntries = standardMetadata.entries;

    function getPath(): string {
        return "";
    }

    function getDomainFromLink(link: string) {
        try {
            const url = new URL(link);
            return url.hostname;
        } catch (error) {
            console.error('Invalid URL:', link);
            return '';
        }
    }

    function addToManager(): void {
        config.add();
    }

    function removeFromManager(): void {
        config.remove();
    }

    function copyToClipboard(): void {
        navigator.clipboard.writeText(getJsonLayerConfig(config));
    }

    function getJsonLayerConfig(config: LayerConfig): string {
        const str = JSON.stringify(config);
        const obj = JSON.parse(str);
        delete obj.added;
        delete obj.ready;

        return JSON.stringify(obj, null, "    ");
    }

    function urlify(text: string): string {
        var urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function (url) {
            return '<a href="' + url + '"target="_blank">' + url + "</a>";
        });
    }

    function isImage(text: string) {
        return(text.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null);
    }

    function syntaxHighlight(json: string) {
        json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return json.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            function (match) {
                var cls = "number";
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = "key";
                    } else {
                        cls = "string";
                    }
                } else if (/true|false/.test(match)) {
                    cls = "boolean";
                } else if (/null/.test(match)) {
                    cls = "null";
                }
                return '<span class="' + cls + '">' + match + "</span>";
            }
        );
    }
</script>

<div class="wrapper">
    <div class="label-01">{path}</div>
    <div class="header">
        
        <div class="heading-03">{config.title}</div>
        <div class="content-switcher">
            <ContentSwitcher size="sm" bind:selectedIndex={contentIndex}>
                <Switch text="Info" />
                <Switch text="Raw" />
            </ContentSwitcher>
        </div>
    </div>
    <div class="divider" />

    <div class="content">
        {#if contentIndex === 0}
            {#if imageUrl}
                <div>
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <img class="layer-image" src={imageUrl} />
                </div>
            {/if}

            <div class="block">
                <div class="label">{$_("tools.layerLibrary.description")}</div>
                {#if config.description}
                    <p class="body-01">{config.description}</p>
                {:else}
                    <p class="body-01">{$_("tools.layerLibrary.noDescription")}</p>
                {/if}
            </div>

            <div class="block">
                <div class="label">{$_("tools.layerLibrary.attribution")}</div>
                {#if attribution}
                    <p class="body-01">{attribution}</p>
                {:else}
                    <p class="body-01">{$_("tools.layerLibrary.noAttribution")}</p>
                {/if}
            </div>

            <div class="block">
                <div class="label">{$_("tools.layerLibrary.layerType")}</div>
                <div class="layer-type">
                    <Tag>
                        {type}
                    </Tag>
                </div>
            </div>

            <div class="block ">
                {#if metadata}
                    {#each metadata as entry}
                        {#if entry.key.toLowerCase() === "herkomst" && isImage(entry.value)}
                            <div class="label">{entry.key}</div>
                            <img class="body-01 img-metadata" src={entry.value} alt={entry.key}/>
                        {:else}
                            <div class="label">{entry.key}</div>
                            <p class="body-01">{@html urlify(entry.value)}</p>
                        {/if}                    
                    {/each}
                {:else if metadataLink}
                    <div class="label">{$_("tools.layerLibrary.metadata")}</div>
                    <a class="body-01" href="{metadataLink}" target="_blank">{$_('tools.layerLibrary.viewRecordOn')} {getDomainFromLink(metadataLink)}</a>
                {:else}
                    <div class="label">{$_("tools.layerLibrary.metadata")}</div>
                    <p class="body-01">{$_("tools.layerLibrary.noMetadata")}</p>
                {/if}
            </div>


            {#if $mdEntries.length > 0}
                {#each $mdEntries as entry}
                    <div class="block">
                        <div class="label">{entry.key}</div>
                        <p class="body-01">{@html urlify(entry.value)}</p>
                    </div>
                {/each}
            {/if}

            <div class="btn-float">
                {#if !$addedToLayerManager}
                    <Button
                        on:click={() => {
                            addToManager();
                        }}>{$_("tools.layerLibrary.btnAddToMap")}</Button
                    >
                {:else}
                    <Button
                        kind="danger"
                        on:click={() => {
                            removeFromManager();
                        }}>{$_("tools.layerLibrary.btnRemoveFromMap")}</Button
                    >
                {/if}
            </div>
        {/if}

        {#if contentIndex === 1}
            <div class="btn-float">
                <Button
                    on:click={() => {
                        copyToClipboard();
                    }}>{$_("tools.layerLibrary.btnCopyToClipboard")}</Button
                >
            </div>
            <pre>
			<code>
				<json>				
					{@html settings}
				</json>
			</code>
		</pre>
        {/if}
    </div>
</div>

<style>

    .wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        user-select: text;
        max-width: 65rem;
    }

    .header {
        width: 100%;
        padding: var(--cds-spacing-03) 0rem var(--cds-spacing-03) 0px;
        display: flex;
        justify-content: space-between;
    }

    .divider {
        background-color: var(--cds-ui-03);
        width: 100%;
        height: 1px;
        margin-bottom: var(--cds-spacing-05);
    }

    .content-switcher {
        width: 10rem;
        flex-shrink: 1;
    }

    .content {
        width: 100%;
        height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
    }

    .btn-float {
        position: absolute;
        bottom: 0;
        right: 0;
    }

    .block {
        margin-bottom: var(--cds-spacing-06);
    }

    .label {
        font-weight: 500;
        margin-bottom: var(--cds-spacing-01);
    }

    .layer-image {
        max-width: 11rem;
        float: right;
        margin: var(--cds-spacing-05);
    }

    .layer-type {
        margin-left: -4px;
    }

    :global(.block p a) {
        color: var(--cds-interactive-01);
        
    }

    .img-metadata {
        max-width: 100%;
    }

    pre {
        white-space: pre-wrap;
        user-select: text;
        padding: 5px;
        margin: 5px;
    }

    json {
        user-select: text;
        font-size: 12px;
    }

    :global(json .string) {
        color: olive;
    }
    :global(json .number) {
        color: navy;
    }
    :global(json .boolean) {
        color: navy;
    }
    :global(json .null) {
        color: magenta;
    }
    :global(json .key) {
        color: brown;
    }
</style>
