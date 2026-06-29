<script lang="ts">
	import { onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { ChevronDown, ChevronUp } from "carbon-icons-svelte";

	export let text: string;

	let expanded = false;
	let overflows = false;
	let el: HTMLParagraphElement | undefined;

	function checkOverflow() {
		if (!expanded && el) overflows = el.scrollHeight > el.clientHeight + 1;
	}

	onMount(() => {
		const observer = new ResizeObserver(() => checkOverflow());
		if (el) observer.observe(el);
		return () => observer.disconnect();
	});
</script>

{#if text}
	<p class="description label-01" class:description-clamped={!expanded} bind:this={el}>{text}</p>
	{#if overflows || expanded}
		<button
			type="button"
			class="description-toggle label-01"
			on:click|stopPropagation={() => (expanded = !expanded)}
		>
			<span>{expanded ? $_("tools.layerManager.showLess") : $_("tools.layerManager.showMore")}</span>
			<svelte:component this={expanded ? ChevronUp : ChevronDown} size={16} />
		</button>
	{/if}
{/if}

<style>
	.description {
		margin-top: var(--cds-spacing-01);
		max-width: 100%;
		margin-bottom: var(--cds-spacing-02);
		overflow-wrap: anywhere;
		word-break: break-word;
		white-space: pre-line;
	}

	.description-clamped {
		display: -webkit-box;
		-webkit-line-clamp: 5;
		line-clamp: 5;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.description-toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--cds-spacing-01);
		margin-bottom: var(--cds-spacing-03);
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--cds-link-01);
	}

	.description-toggle:hover {
		color: var(--cds-link-primary-hover, var(--cds-hover-primary-text));
		text-decoration: underline;
	}

	.description-toggle:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}
</style>
