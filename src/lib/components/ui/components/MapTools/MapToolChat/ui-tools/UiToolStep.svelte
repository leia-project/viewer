<script lang="ts">
	import { createEventDispatcher } from "svelte";

	/* Eén instructie van de assistent aan de viewer (bijv. "voeg deze laag toe"):
	   wat hij wil doen, en óf de keuze van de gebruiker, óf hoe het is afgelopen. */
	export let summary: string;
	export let status: "awaiting" | "running" | "applied" | "dismissed" | "failed" | "expired";
	export let detail: string | undefined = undefined;

	const dispatch = createEventDispatcher<{ apply: void; dismiss: void; always: void }>();

	const STATUS_LABELS = {
		running: "Bezig…",
		applied: "Uitgevoerd",
		dismissed: "Genegeerd",
		failed: "Mislukt",
		expired: "Niet meer van toepassing"
	};
</script>

<div class="ui-step" class:ui-step--failed={status === "failed"} class:ui-step--applied={status === "applied"}>
	<span class="ui-step__summary">{summary}</span>

	{#if status === "awaiting"}
		<div class="ui-step__actions">
			<button class="ui-step__button ui-step__button--primary" type="button" on:click={() => dispatch("apply")}>
				Uitvoeren
			</button>
			<button class="ui-step__button" type="button" on:click={() => dispatch("dismiss")}>Negeren</button>
			<button class="ui-step__link" type="button" on:click={() => dispatch("always")}>
				Altijd automatisch uitvoeren
			</button>
		</div>
	{:else}
		<span class="ui-step__status">
			{STATUS_LABELS[status]}{#if status === "failed" && detail}: {detail}{/if}
		</span>
	{/if}
</div>

<style>
	.ui-step {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid var(--cds-interactive-01, #0f62fe);
		background: var(--cds-field-01, #ffffff);
		font-size: 0.75rem;
		color: var(--cds-text-01, #161616);
	}

	.ui-step--applied {
		border-left-color: var(--cds-support-02, #24a148);
	}

	.ui-step--failed {
		border-left-color: var(--cds-support-01, #da1e28);
	}

	.ui-step__summary {
		overflow-wrap: anywhere;
	}

	.ui-step__status {
		color: var(--cds-text-02, #525252);
		font-style: italic;
		overflow-wrap: anywhere;
	}

	.ui-step__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.ui-step__button {
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--cds-ui-04, #8d8d8d);
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.ui-step__button--primary {
		border-color: var(--cds-interactive-01, #0f62fe);
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
	}

	.ui-step__link {
		padding: 0;
		border: none;
		background: none;
		color: var(--cds-text-02, #525252);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
