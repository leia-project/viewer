<script lang="ts">
    import { _ } from 'svelte-i18n';
	import { Modal } from 'carbon-components-svelte';
	import { Settings } from 'carbon-icons-svelte';
	import Language from './Language.svelte';


    let open = false;

    function switchModalState() {
		open = !open;
	}
</script>

<button on:click={switchModalState} class="qa-btn qa-btn-primary" title="">
    <Settings size={16} />
</button>

<div class="hidden">
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
			<button type="button" class="btn preset-filled" on:click={switchModalState}>{$_("common.close")}</button>
		</footer>
	</Modal>
</div>


<style>
	.qa-btn {
        border: none;
        border-radius: 0.375rem;
        padding: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .qa-btn-primary {
        background-color: var(--primary-500);
        color: white;
    }

    .qa-btn-primary:hover {
        background-color: var(--primary-600);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--surface-200);
    }

    .modal-title {
        font-size: 1.25rem; /* Equivalent to text-lg */
        color: var(--surface-800);
    }

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
