<script lang="ts">
    import { _ } from "svelte-i18n";
    import { SkeletonText, Tag } from "carbon-components-svelte";
    import { ChevronRight } from "carbon-icons-svelte";

    export let connector: { label: string; url: string };
</script>

<div class="group-skeleton">
    <div class="chevron">
        <ChevronRight />
    </div>
    <div class="group-title">
        <SkeletonText width="60%" />
    </div>
    {#if connector.label && connector.url}
        <a href="{connector.url}" title="{$_('general.goTo') + ' ' + connector.label}" target="_blank" style="cursor: pointer">
            <Tag type="green" size="sm" interactive="{true}">{connector.label}</Tag>
        </a>
    {/if}
    <div class="group-count">
        <Tag size="sm">0/0</Tag>
    </div>
</div>

<style>
    .group-skeleton {
        display: flex;
        align-items: center;
    }

    .chevron {
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .group-title {
        margin-left: var(--cds-spacing-02);
        display: flex;
        align-items: center;
        flex-grow: 1;
    }

    .group-count {
        white-space: nowrap;
    }

    .group-skeleton :global(.bx--skeleton__text) {
        margin-bottom: 0;
    }
</style>
