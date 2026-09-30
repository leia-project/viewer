<script lang="ts">
	import { Information } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	export let url: string | undefined = undefined;
	export let size: number = 16;
</script>

{#if url}
	<a
		class="metadata-link"
		href={url}
		target="_blank"
		rel="noopener noreferrer"
		title={$_("tools.layerManager.openMetadata")}
		aria-label={$_("tools.layerManager.openMetadata")}
	>
		<Information {size} />
	</a>
{/if}

<style>
	.metadata-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 2px;
		border-radius: 2px;
		color: var(--cds-icon-primary, #161616);
		text-decoration: none;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.metadata-link:hover,
	.metadata-link:focus-visible {
		color: var(--cds-link-primary, #0f62fe);
	}

	.metadata-link:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: -2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.metadata-link {
			transition: none;
		}
	}
</style>
