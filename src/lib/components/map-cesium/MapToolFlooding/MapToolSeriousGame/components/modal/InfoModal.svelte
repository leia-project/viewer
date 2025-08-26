<script lang="ts">
	import { onDestroy, onMount, type ComponentType } from "svelte";
	import { Modal } from "carbon-components-svelte";
	import type { Game } from "../../module/game";

	export let game: Game;

	let open: boolean = false;
	let component: ComponentType;
	let args: any;

	function mountComponent(data: any): void {
		component = data.component;
		args = data.args;
		open = true;
	}

	onMount(() => game.on("open-modal", mountComponent));
	onDestroy(() => game.off("open-modal", mountComponent));

</script>


<Modal
	bind:open
	size="lg"
	passiveModal={true}
	preventCloseOnClickOutside={true}
	modalHeading={""}
	id="game-modal"
>
	{#if component}
		{#key open}
			<svelte:component this={component} {...args} on:close={() => open = false} />
		{/key}
	{/if}
</Modal>


<style>

	:global(#game-modal .bx--modal-container) {
		background-color: rgb(var(--game-color-bg));
	}
	:global(#game-modal .bx--modal-content) {
		color: var(--game-color-text);
	}
	:global(#game-modal .bx--modal-close) {
		display: none;
	}

</style>