<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Close from "carbon-icons-svelte/lib/Close.svelte";
    import Button from "../Button/Button.svelte";
    import type { MapToolMenuOption } from "./MapToolMenuOption";

    export let tool: MapToolMenuOption;

    $: label = tool.label;

    const dispatch = createEventDispatcher();

    function onClose(event: MouseEvent): void {
        dispatch("close", event);
    }
</script>

<div class="tool-header">
    <div class="heading-03">
        {$label}
    </div>

    <div class="close">
        <Button
            kind="ghost"
            iconDescription={undefined}
            icon={Close}
            size="small"
            on:click={(e) => {
                onClose(e);             
            }}
        />
    </div>
</div>

<div class="divider" />

<style>
    .divider {
        background-color: var(--cds-ui-03);
        width: 100%;
        height: 1px;
    }

    .tool-header {
        display: flex;
        flex-shrink: 1;
        justify-content: space-between;
        align-items: center;
        padding: var(--cds-spacing-05) 0 0 var(--cds-spacing-05);
        background-color: var(--cds-ui-02);
        box-sizing: border-box;
    }

    .close {
        position: absolute;
        top: var(--cds-spacing-01);
        right: var(--cds-spacing-01);
    }
</style>
