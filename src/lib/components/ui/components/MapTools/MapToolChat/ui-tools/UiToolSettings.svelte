<script lang="ts">
	import { UI_TOOLS } from "./tools";
	import { uiToolApproval, setApproval } from "./settings";

	/* Per soort instructie: meteen uitvoeren zodra de assistent erom vraagt, of eerst
	   om akkoord vragen. Zonder keuze van de gebruiker geldt de standaard van de tool. */
	const LABELS: Record<string, string> = {
		add_layer: "Lagen toevoegen",
		fly_to: "De kaart naar een laag verplaatsen",
		set_layer_visibility: "Lagen tonen of verbergen",
		color_layer_by_property: "Lagen kleuren op basis van een eigenschap",
		remove_layer: "Lagen verwijderen"
	};
</script>

<div class="ui-settings">
	<span class="ui-settings__title">Instructies van de assistent</span>
	<span class="ui-settings__hint">Vink aan wat de assistent mag doen zonder eerst te vragen.</span>
	{#each UI_TOOLS as tool}
		<label class="ui-settings__option">
			<input
				type="checkbox"
				checked={($uiToolApproval[tool.name] ?? tool.defaultApproval) === "auto"}
				on:change={(event) => setApproval(tool.name, event.currentTarget.checked ? "auto" : "ask")}
			/>
			<span>{LABELS[tool.name] ?? tool.name}</span>
		</label>
	{/each}
</div>

<style>
	.ui-settings {
		position: absolute;
		top: 3.5rem;
		right: 0.5rem;
		z-index: 12;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 18rem;
		padding: 0.75rem;
		background: var(--cds-ui-01, #f4f4f4);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		box-shadow: 0 2px 12px rgb(0 0 0 / 25%);
		color: var(--cds-text-01, #161616);
		font-size: 0.875rem;
	}

	.ui-settings__title {
		font-weight: 600;
	}

	.ui-settings__hint {
		font-size: 0.75rem;
		color: var(--cds-text-02, #525252);
	}

	.ui-settings__option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
