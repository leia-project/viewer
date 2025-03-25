<script lang="ts">
    import { _ } from 'svelte-i18n';
	import { Modal } from 'carbon-components-svelte';
	import { Settings } from 'carbon-icons-svelte';
	import Language from './Language.svelte';


    let openState = false;

    function switchModalState() {
		openState = !openState;
	}
</script>

<button on:click={switchModalState} class="btn-icon preset-filled" title="">
    <Settings size={16} />
</button>

<div class="hidden">
	<Modal
		bind:open={openState}
	>
		<header class="flex justify-between">
			<h2 class="h2">{$_("settings.title")}</h2>
		</header>

		<div class="mb-4 h-full overflow-y-auto p-4">
			<article class="flex h-full flex-col gap-4">
				<Language />
			</article>
		</div>
		<footer class="flex justify-end gap-4">
			<button type="button" class="btn preset-filled" on:click={switchModalState}>{$_("common.close")}</button>
		</footer>
	</Modal>
</div>


<style>

	/*
	backdrop-blur-sm
	*/

	/*
	card bg-surface-100-900 p-4 flex flex-col space-y-4 shadow-xl max-h-[80%] min-w-[80%] max-w-screen-xl min-w-screen-xl overflow-hidden
	*/

</style>
