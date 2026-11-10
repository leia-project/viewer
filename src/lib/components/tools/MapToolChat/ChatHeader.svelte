<script lang="ts">
	import Currency from "carbon-icons-svelte/lib/Currency.svelte";
	import Download from "carbon-icons-svelte/lib/Download.svelte";
	import SettingsIcon from "carbon-icons-svelte/lib/Settings.svelte";
	import { createEventDispatcher } from "svelte";

	import { _, locale } from "svelte-i18n";

	import { chatApiUrl } from "./chat-store";

	/* Kop van het chatpaneel: welk model antwoordt, wat het gesprek tot nu toe kostte,
	   en de knoppen voor de instructie-instellingen en de export. */
	export let totalTokens: number;
	export let exportDisabled: boolean;
	export let settingsOpen: boolean;

	const dispatch = createEventDispatcher<{ export: void }>();

	let modelName: string | null = null;
	let providerName: string | null = null;

	$: if ($chatApiUrl) fetchConfig($chatApiUrl);

	async function fetchConfig(apiUrl: string) {
		const data = await (await fetch(`${apiUrl}/config`)).json();
		modelName = data.llm_model;
		providerName = data.llm_provider;
	}

	/* Alleen Ollama heeft een vertaling nodig: "(lokaal)". */
	$: PROVIDER_LABELS = {
		openrouter: "OpenRouter",
		ollama: $_("tools.chat.ollamaLocal"),
		anthropic: "Anthropic"
	} as Record<string, string>;

	$: providerLabel = providerName ? (PROVIDER_LABELS[providerName] ?? providerName) : "";

	/* Past in de kop: 17.893 wordt "17,9K". De taal bepaalt het decimaalteken en de
	   afkorting ("mln." i.p.v. "M"). */
	$: compactTokens = new Intl.NumberFormat($locale ?? undefined, {
		notation: "compact",
		maximumFractionDigits: 1
	});
</script>

<header class="chat-header">
	<div class="chat-header__heading">
		<span>{$_("tools.chat.title")}</span>
		{#if modelName}
			<span class="chat-header__meta">
				<span>{$_("tools.chat.modelVia", { values: { model: modelName, provider: providerLabel } })}</span>
				{#if totalTokens > 0}
					&middot;
					<span
						class="chat-header__tokens"
						title={$_("tools.chat.tokens", {
							values: { count: totalTokens.toLocaleString($locale ?? undefined) }
						})}
					>
						<Currency size={16} />
						{compactTokens.format(totalTokens)}
					</span>
				{/if}
			</span>
		{/if}
	</div>

	<div class="chat-header__actions">
		<button
			class="chat-header__action"
			type="button"
			aria-expanded={settingsOpen}
			title={$_("tools.chat.settings")}
			aria-label={$_("tools.chat.settings")}
			on:click={() => (settingsOpen = !settingsOpen)}
		>
			<SettingsIcon size={20} />
		</button>
		<button
			class="chat-header__action"
			type="button"
			disabled={exportDisabled}
			title={$_("tools.chat.export")}
			aria-label={$_("tools.chat.export")}
			on:click={() => dispatch("export")}
		>
			<Download size={20} />
		</button>
	</div>
</header>

<style>
	.chat-header {
		display: flex;
		gap: 0.7rem;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--cds-ui-03, #e0e0e0);
		background: var(--cds-ui-01, #f4f4f4);
	}

	/* Titel en modelregel onder elkaar, zodat ze samen één flex-item vormen. */
	.chat-header__heading {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		min-width: 0;
	}

	.chat-header__meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		opacity: 0.7;
		font-size: 0.7rem;
		overflow-wrap: anywhere;
	}

	/* Het getal en zijn eenheid ("13,6K") niet over twee regels. */
	.chat-header__tokens {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.chat-header__actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.chat-header__action {
		display: flex;
		align-items: center;
		padding: 0.25rem;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		border-radius: 4px;
	}

	.chat-header__action:hover:not(:disabled) {
		background: var(--cds-ui-03, #e0e0e0);
	}

	.chat-header__action:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
