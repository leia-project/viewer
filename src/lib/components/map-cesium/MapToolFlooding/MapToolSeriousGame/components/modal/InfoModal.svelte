<script lang="ts">
	import { Modal } from "carbon-components-svelte";
	import type { Game } from "../../module/game";
	import { onDestroy, onMount, type ComponentType } from "svelte";

	export let game: Game;

	let open: boolean = false;
	let component: ComponentType;
	let args: any;

	function mountComponent(data: any): void {
		console.log("Mounting component", data);
		component = data.component;
		args = data.args;
		open = true;
	}

	onMount(() => game.on("open-modal", mountComponent));
	onDestroy(() => game.off("open-modal", mountComponent));

</script>


<Modal
	bind:open
	passiveModal={true}
	preventCloseOnClickOutside={true}
>
	{#if component}
		<svelte:component this={component} {...args} />
	{/if}
</Modal>