<script lang="ts">
	import { NumberInput } from "carbon-components-svelte";
    import { _ } from "svelte-i18n";

	import type { Writable } from "svelte/store";

    export let height: Writable<number>;
</script>

<div class="wrapper">
    <NumberInput label="{$_("tools.layerManager.heightControlLabel")}" bind:value={$height} light={false}></NumberInput>
</div>

<style>
    .wrapper {
		margin: 10px 0 15px;
	}
</style>