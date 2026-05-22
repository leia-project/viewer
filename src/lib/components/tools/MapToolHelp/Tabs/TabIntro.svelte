<script lang="ts">
    import { _ } from "svelte-i18n";
	import { DocumentPdf } from "carbon-icons-svelte";
	import Button from "$lib/components/theme/Button/Button.svelte";
    import type { IDownloadButton } from "../download-button";
    
    export let customIntroText: string | undefined;
    export let downloadButton: IDownloadButton | undefined;

    $: introText = customIntroText ?? $_("tools.help.intro.introDescription");
    $: downloadPDFButton = downloadButton ?? undefined;

</script>


<div class="body-02">
    {@html introText}
    <br />
</div>

{#if downloadPDFButton?.enabled}
    <Button icon={DocumentPdf} href={downloadPDFButton.url} target="_blank">
        {downloadPDFButton.label}
    </Button>
{/if}

