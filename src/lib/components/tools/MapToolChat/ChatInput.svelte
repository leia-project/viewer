<script lang="ts">
	import SendAltFilled from "carbon-icons-svelte/lib/SendAltFilled.svelte";
	import { createEventDispatcher, tick } from "svelte";

	/* Het invoerveld met verstuurknop. Meldt een vraag met `submit` en leegt zichzelf. */
	export let disabled = false;

	const dispatch = createEventDispatcher<{ submit: string }>();

	let question = "";
	let inputEl: HTMLTextAreaElement;

	function submit() {
		if (disabled) return;
		dispatch("submit", question);
		question = "";
	}

	/* Enter verstuurt. Shift+Enter maakt een nieuwe regel (doet de browser zelf), net als
	   Ctrl/Cmd+Enter, die we met de hand op de cursorpositie zetten. */
	async function handleKeydown(event: KeyboardEvent) {
		if (event.key !== "Enter" || event.shiftKey) return;
		event.preventDefault();
		if (!event.ctrlKey && !event.metaKey) return submit();

		const el = event.currentTarget as HTMLTextAreaElement;
		const { selectionStart: start, selectionEnd: end } = el;
		question = question.slice(0, start) + "\n" + question.slice(end);
		/* Pas na `tick` staat de nieuwe waarde in het veld en kan de cursor erachter. */
		await tick();
		el.setSelectionRange(start + 1, start + 1);
	}

	/* Een textarea groeit niet vanzelf mee: na elke wijziging van `question` (typen,
	   nieuwe regel, legen na versturen) opnieuw meten, na `tick` zodat de waarde er staat. */
	$: if (inputEl) tick().then(() => autoGrow(question));

	const MAX_INPUT_HEIGHT = 120;

	/* Hoogte eerst op auto, zodat scrollHeight de inhoud meet; die telt de rand niet mee.
	   Pas boven MAX_INPUT_HEIGHT scrollt het veld. Verborgen valt er niets te meten.
	   Via een lokale `el`: `inputEl.style…` zou `inputEl` als gewijzigd markeren, en dan
	   liep de regel hierboven eindeloos opnieuw. */
	function autoGrow(_question: string) {
		const el = inputEl;
		el.style.height = "";
		if (!el.offsetParent) return;
		el.style.height = "auto";
		const height = el.scrollHeight + el.offsetHeight - el.clientHeight;
		el.style.height = `${Math.min(height, MAX_INPUT_HEIGHT)}px`;
		el.style.overflowY = height > MAX_INPUT_HEIGHT ? "auto" : "hidden";
	}
</script>

<div class="chat-input">
	<textarea
		class="chat-input__field"
		bind:this={inputEl}
		bind:value={question}
		placeholder="Stel een vraag"
		{disabled}
		rows="1"
		on:keydown={handleKeydown}
	></textarea>
	<button class="chat-input__send" type="button" {disabled} aria-label="Verstuur vraag" on:click={submit}>
		<SendAltFilled size={20} />
	</button>
</div>

<style>
	.chat-input {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		border-top: 1px solid var(--cds-ui-03, #e0e0e0);
		padding: 0.7rem;
		background: var(--cds-ui-01, #f4f4f4);
	}

	.chat-input__field {
		flex: 1;
		min-width: 0;
		/* Zelf slepen uit; de hoogte komt van autoGrow. */
		resize: none;
		overflow-y: hidden;
		box-sizing: border-box;
		/* Even hoog als de verstuurknop zolang er één regel staat. */
		min-height: 2.25rem;
		padding: 0.5rem;
		/* De rand is een outline: een globale `:focus`-regel zet `border` met
		   !important op 0, waardoor het veld bij focus versprong. Een outline
		   neemt geen ruimte in, dus de focusring verandert de maat niet. */
		border: 0;
		outline: 1px solid var(--cds-ui-03, #8d8d8d);
		outline-offset: -1px;
		color: inherit;
		font: inherit;
		line-height: 1.125rem;
	}

	.chat-input__send {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-sizing: border-box;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: none;
		background: var(--cds-interactive-01, #0f62fe);
		color: var(--cds-text-04, #ffffff);
		cursor: pointer;
	}

	/* Eén regel dekt beide: zolang de agent denkt staan veld en knop uit. */
	.chat-input__field:disabled,
	.chat-input__send:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
