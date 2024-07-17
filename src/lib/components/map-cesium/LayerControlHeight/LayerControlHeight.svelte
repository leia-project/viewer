<script lang="ts">
	import { TextInput } from "carbon-components-svelte";
	import { writable } from "svelte/store";

	import type { Writable } from "svelte/store";

    export let tilesetHeight: Writable<number>;

    const height = writable<string>("");
    let invalid = false;

    height.subscribe(h => {
        const length = h.length;
        if(h[length -1] === ".") {
            invalid = true;
            return;
        }

        const number = Number.parseFloat(h);
        if (Number.isNaN(number)) {
            invalid = true;
            return;
        }

        invalid = false;
        tilesetHeight.set(number);
    });

    tilesetHeight.subscribe(h => {
        height.set(h.toString());
    })
</script>

<div>
    <TextInput labelText="Tileset height" invalid={invalid ? true : false} bind:value={$height} light={false}></TextInput>
</div>

<style>

</style>