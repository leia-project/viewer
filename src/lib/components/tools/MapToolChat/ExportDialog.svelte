<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";

	/* Vraagt waarom je het gesprek exporteert. Die reden komt in het bestand, zodat een
	   map met exports vanzelf een lijst met klachten wordt. */
	const dispatch = createEventDispatcher<{ confirm: string; cancel: void }>();

	let reason = "";

	const confirm = () => dispatch("confirm", reason.trim());

	/* Svelte-action: de cursor staat meteen in het veld. */
	const focusOnMount = (node: HTMLElement) => node.focus();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") dispatch("cancel");
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) confirm();
	}
</script>

<div class="export-dialog">
	<div class="export-dialog__box">
		<label class="export-dialog__label" for="export-reason">{$_("tools.chat.exportReason")}</label>
		<textarea
			id="export-reason"
			class="export-dialog__input"
			rows="3"
			bind:value={reason}
			use:focusOnMount
			on:keydown={handleKeydown}
		></textarea>
		<div class="export-dialog__actions">
			<button class="export-dialog__button" type="button" on:click={() => dispatch("cancel")}>
				{$_("tools.chat.cancel")}
			</button>
			<button class="export-dialog__button export-dialog__button--primary" type="button" on:click={confirm}>
				{$_("tools.chat.exportConfirm")}
			</button>
		</div>
	</div>
</div>

<style>
	/* Absolute binnen het chatpaneel (position: relative), dus de overlay dekt
	   alleen het paneel en niet de hele kaart. */
	.export-dialog {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgb(0 0 0 / 40%);
		z-index: 11;
	}

	.export-dialog__box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		padding: 1rem;
		background: var(--cds-ui-01, #f4f4f4);
		border: 1px solid var(--cds-ui-03, #e0e0e0);
		box-shadow: 0 2px 12px rgb(0 0 0 / 25%);
	}

	.export-dialog__label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.export-dialog__input {
		padding: 0.5rem;
		border: 1px solid var(--cds-ui-04, #8d8d8d);
		background: var(--cds-field-01, #ffffff);
		color: inherit;
		font: inherit;
		resize: vertical;
	}

	.export-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.export-dialog__button {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--cds-ui-04, #8d8d8d);
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.export-dialog__button--primary {
		border-color: var(--cds-interactive-01, #0f62fe);
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
	}
</style>
