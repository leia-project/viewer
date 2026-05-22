<script lang="ts">
    import { getContext, createEventDispatcher } from "svelte";
    import { _ } from "svelte-i18n";
    import { Tooltip } from "carbon-components-svelte";            
    import type { MapToolMenuOption } from "./MapToolMenuOption";

    export let tool: MapToolMenuOption | undefined;
    export let showLabel: boolean = true;
    export let overrideIcon: any = undefined;
    export let overrideLabel: string | undefined  = undefined;
    export let overrideActive: boolean | undefined = undefined;

    const { selectedTool } = getContext<any>("mapTools");

    $: active = overrideActive !== undefined ? overrideActive : tool === $selectedTool;
    $: icon = overrideIcon ? overrideIcon : tool?.icon;
    $: label = overrideLabel ? overrideLabel : tool?.label;

    let hover: boolean;
    const dispatch = createEventDispatcher();

    function onClick(event: MouseEvent): void {
        dispatch("click", event);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="wrapper"
    class:tool--active={active}
    class:wrapper--hover={hover}
    class:wrapper-show-label={showLabel}
    on:click={onClick}
    on:mouseenter={(e) => {
        hover = true;
    }}
    on:mouseleave={(e) => {
        hover = false;
    }}
    role="button"
    tabindex="0"
>
    <div class="icon">
        <svelte:component
            this={icon}
            class="tool-icon {active ? 'active' : ''} {hover ? 'hover' : ''}"
            slot="icon"
            size={24}
        />
    </div>

    {#if label}
        {#if !showLabel && !active}
            <Tooltip open={hover} align="end" direction="right" hideIcon class="tooltip">
                {$_(label)}
            </Tooltip>
        {/if}

        {#if showLabel && !active}
            <div
                class="tool-label"
                class:tool-label--active={active}
                class:tool-label--hover={hover && !active}
            >
                {$_(label)}
            </div>
        {/if}
    {/if}
    <div class="active-border" class:active-border--active={active} />
</div>

<style>
    .wrapper {
        position: relative;
        display: flex;
        align-content: center;
        align-items: center;
        box-sizing: border-box;
        transition: background-color 0.15s;
    }

    .wrapper--hover {
        background-color: var(--cds-ui-01);
        cursor: pointer;
    }

    .wrapper-show-label {
        width: 100%;
        padding-right: 1.5rem;
    }

    .icon {
        width: 3rem;
        height: 3rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-content: center;
        align-items: center;
    }

    .tool--active {
        background-color: var(--cds-ui-01);
    }

    .active-border {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        border-left: 4px solid rgba(0, 0, 0, 0);
    }

    .active-border--active {
        border-left: 4px solid var(--cds-interactive-01);
    }

    .tool-label {
        color: var(--cds-text-03);
        white-space: nowrap;
    }

    .tool-label--hover {
        color: var(--cds-text-01);
    }

    .tool-label--active {
        color: var(--cds-interactive-01);
    }
</style>
