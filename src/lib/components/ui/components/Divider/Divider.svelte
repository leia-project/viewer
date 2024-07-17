<script lang="ts">
    export let direction: "horizontal" | "vertical" = "horizontal";

    $: horizontal = direction == "horizontal";
    $: vertical = direction == "vertical";
</script>

<div class="div-wrap" class:horizontal class:vertical>
    <div class="divider" />
</div>

<style>
    .div-wrap {
        box-sizing: border-box;
    }

    .horizontal {
        width: 100%;
        height: 1px;
        padding: var(--cds-spacing-03) var(--cds-spacing-02);
    }

    .vertical {
        height: 100%;
        width: 1px;
        padding: var(--cds-spacing-02) var(--cds-spacing-03);
    }

    .divider {
        background-color: var(--cds-ui-03);
        width: inherit;
        height: inherit;
    }
</style>
