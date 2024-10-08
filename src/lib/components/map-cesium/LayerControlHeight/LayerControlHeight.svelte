<script lang="ts">
	import { NumberInput } from "carbon-components-svelte";
    import { _ } from "svelte-i18n";
	import { writable } from "svelte/store";

	import type { Writable } from "svelte/store";

    export let tilesetHeight: Writable<number>;

    const height = writable<number>(0);
    let invalid = false;

    height.subscribe(number => {
        if (Number.isNaN(number)) {
            invalid = true;
            return;
        }
        invalid = false;
        tilesetHeight.set(number);
    });

    tilesetHeight.subscribe(h => {
        height.set(h);
    })
</script>

<div>
    <NumberInput label="{$_("tools.layerManager.heightControlLabel")}" invalid={invalid ? true : false} bind:value={$height} light={false}></NumberInput>
</div>

<style>

</style>