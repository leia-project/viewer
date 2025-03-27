<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Modal } from 'carbon-components-svelte';
	import Language from './Language.svelte';

	export let open: boolean;
	
</script>


<Modal
	modalHeading={$_("settings.title")}
	bind:open
	passiveModal={true}
>
	<div class="modal-body">
		<article class="modal-content">
			<Language />
		</article>
	</div>
	<footer class="modal-footer">
		<button type="button" class="btn preset-filled" on:click={() => open = false}>{$_("common.close")}</button>
	</footer>
</Modal>


<style>

	.modal-body {
		margin-bottom: 1rem;
		height: 100%;
		overflow-y: auto;
		padding: 1rem;
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1rem;
		border-top: 1px solid var(--surface-200);
	}

</style>
