<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Modal } from "carbon-components-svelte";
    import { _ } from "svelte-i18n";
    import { get } from "svelte/store";
    import { Attribution } from "$lib/components/ui/models/Attribution";

    export let txtTitle = get(_)("tools.info.info");
    export let txtClose = get(_)("tools.info.close");
    export let txtGeneral = get(_)("tools.info.general");
    export let txtAttribution = get(_)("tools.info.attribution");
    export let txtViewerTitle: string | undefined;
    export let txtViewerDescription: string | undefined;
    export let attribution: Array<Attribution> = new Array<Attribution>();

    export let tostiAttribution = new Array<Attribution>(
        new Attribution(
            "carbon-components-svelte",
            "Design System and components used in our application",
            "carbon-components-svelte Contributors",
            "https://github.com/carbon-design-system/carbon-components-svelte",
            "Apache License 2.0"
        ),
        new Attribution(
            "carbon-icons-svelte",
            "Most of the icons used in our application",
            "carbon-icons-svelte Contributors",
            "https://github.com/carbon-design-system/carbon-icons-svelte",
            "Apache License 2.0"
        ),
        new Attribution(
            "fontsource/open-sans",
            "Font used in our application",
            "fontsource/open-sans Contributors",
            "https://github.com/fontsource/fontsource",
            "MIT"
        ),
        new Attribution(
            "svelte-parts/zoom",
            "Used in FeatureInfo popups containing a zoomable image",
            "Idris-maps",
            "https://github.com/idris-maps/svelte-parts",
            "Unknown license"
        ),
        new Attribution(
            "fuzzysort",
            "Fast, Tiny, & Good SublimeText-like fuzzy search for JavaScript.",
            "farzher",
            "https://github.com/farzher/fuzzysort",
            "MIT"
        ),
        new Attribution(
                     "Aim Logo Icon",
            "Used as a position selection marker for the human perspective.",
            "Pixel Icons",
            "https://iconscout.com/free-icon/aim-183_722670",
            "Creative Commons Attribution 4"
        ), 
    );

    $: att = [...attribution, ...tostiAttribution];

    const dispatch = createEventDispatcher();

    function removeFromView(e: any) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        dispatch("remove");
    }
</script>

<Modal
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
    <p>
        {txtGeneral}
    </p>

    {#if txtViewerTitle}
        <div class="viewer-text">
            <h4>{txtViewerTitle}</h4>
            <p>{@html txtViewerDescription}</p>
        </div>
    {/if}

    <div class="attribution-wrapper">
        <h4>{txtAttribution}</h4>
        {#each att as a}
            <div class="attribution">
                <!-- svelte-ignore security-anchor-rel-noreferrer -->
                <h5><a href={a.source} target="_blank">{a.title}</a></h5>
                <p class="description">{a.description}</p>
                <div class="license">
                    by {a.author} - {a.license}
                </div>
            </div>
        {/each}
    </div>
</Modal>

<style>
    .viewer-text {
        width: 100%;
        margin-top: var(--cds-spacing-05);
        margin-bottom: var(--cds-spacing-03);
    }

    .viewer-text h4 {
        margin-bottom: var(--cds-spacing-03);
    }

    .attribution-wrapper {
        margin-top: var(--cds-spacing-05);
    }

    .attribution {
        background-color: var(--cds-ui-03);
        padding: var(--cds-spacing-03);
        margin-top: var(--cds-spacing-03);
        margin-bottom: var(--cds-spacing-03);
    }

    .license {
        width: 100%;
        text-align: right;
        font-size: var(--tosti-font-size-small);
    }

    .description {
        margin-top: var(--cds-spacing-03);
    }

    h5 a {
        text-decoration: none;
        color: black;
    }
</style>
