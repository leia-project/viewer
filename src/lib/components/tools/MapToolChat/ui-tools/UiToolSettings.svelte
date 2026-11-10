<script lang="ts">
	import { _ } from "svelte-i18n";

	import { UI_TOOLS } from "./tools";
	import { uiToolApproval, setApproval } from "./settings";
	import { Checkbox } from "carbon-components-svelte";

	/* Per soort instructie: meteen uitvoeren zodra de assistent erom vraagt, of eerst
	   om akkoord vragen. Zonder keuze van de gebruiker geldt de standaard van de tool.
	   Een tool zonder vertaling (`tools.chat.uiTools.<naam>`) toont zijn naam. */
	const label = (name: string) => $_(`tools.chat.uiTools.${name}`, { default: name });
</script>

<div class="ui-settings">
	<span class="ui-settings__title">{$_("tools.chat.settings")}</span>
	<span class="ui-settings__hint">{$_("tools.chat.settingsHint")}</span>
	{#each UI_TOOLS as tool}
		<Checkbox checked={($uiToolApproval[tool.name] ?? tool.defaultApproval) === "auto"} 
		on:check={(event) => setApproval(tool.name, event.detail ? "auto" : "ask")}
		labelText={label(tool.name)} />
	{/each}
</div>

<style>
	.ui-settings {
		position: absolute;
		top: 3rem;
		right: 0.5rem;
		z-index: 12;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 18rem;
		padding: 0.75rem;
		background: var(--cds-ui-01, #f4f4f4);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		box-shadow: 0 2px 15px rgb(0 0 0 / 10%);
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
