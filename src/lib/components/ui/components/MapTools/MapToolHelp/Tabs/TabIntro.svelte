<script lang="ts">
    import { _ } from "svelte-i18n";
	import Button from "../../../Button/Button.svelte";
	import DocumentPdf from "carbon-icons-svelte/lib/DocumentPdf.svelte";
    import IDownloadButton from "./../MapToolHelpView.svelte";
    
    export let customIntroText: string | undefined;
    export let downloadButton: IDownloadButton | undefined;

    $: introText = customIntroText ?? $_("tools.help.intro.introDescription");
    $: downloadPDFButton = downloadButton ?? undefined;

</script>


<div class="body-02">
    {@html introText}<br /><br />
</div>

<div class="body-02">
    {$_("tools.help.intro.moreInfo")}
</div>

{#if downloadPDFButton?.enabled}
    <Button icon={DocumentPdf} href={downloadPDFButton.url}>
        {downloadPDFButton.label}
    </Button>
{/if}

