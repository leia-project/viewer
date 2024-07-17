<script lang="ts">
	import Warning from "carbon-icons-svelte/lib/Warning.svelte";

    export let message: string = "";

</script>

<div class="label-01 error-container url-error-message">
    <Warning style="flex-shrink: 0"/>
    <span>{message}</span>
</div>

<style>
    .error-container {
        display: flex;
        align-items: center;
        gap: var(--cds-spacing-02);
    }

    .url-error-message {
		color: #750e13;
	}
</style>