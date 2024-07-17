<script lang="ts">
	import { Slider } from "carbon-components-svelte";
	
    import type { Writable } from "svelte/store";

    export let title: string;
    export let min: number;
    export let max: number;
    export let step: number;

    export let minLabel: string | undefined;
    export let maxLabel: string | undefined;
    
    export let value: Writable<number>;

    $: showMinLabel = minLabel === undefined ? min.toString() : minLabel;
    $: showMaxLabel = maxLabel === undefined ? max.toString() : maxLabel;

    export let displayValue: Writable<string>;
</script>

<div class="wrapper">
    <Slider labelText={title} fullWidth={true} bind:value={$value} hideTextInput={true} {min} {max} {step} minLabel={showMinLabel} maxLabel={showMaxLabel}></Slider>
    <div class="value label-01">
        {$displayValue}
    </div>
</div>

<style>
    .wrapper {
        width: 100%;        
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
    }

    .value {
        padding-top: var(--cds-spacing-03);        
        align-items: center;
        align-content: center;
        text-align: center;
        border-radius: 1rem;
        vertical-align: middle;
    }
</style>