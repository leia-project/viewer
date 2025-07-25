<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { Popover } from "carbon-components-svelte";
	
	const dispatch = createEventDispatcher();
	
	export let icon: any = undefined;
	export let size: number = 22;
	export let active: boolean | undefined = undefined;
	export let hasTooltip: boolean = false;
	export let borderHighlight: boolean = false;

	let ref: HTMLDivElement;
	let open: boolean;

	function click(): void {
		const slot = ref.querySelector(`[slot="popover"]`);
		if (slot) {
			open = !open;
		}
		dispatch("click");
	}

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="toolbar-button-container" 
	bind:this={ref} 
	on:mouseenter={() => open = hasTooltip} 
	on:mouseleave={() => open = false} 
	style={`
		--button-size: ${size};
	`}
>
	<div class="toolbar-button" on:click={click} class:active style={`border-color: ${borderHighlight ? "var(--game-color-highlight)" : "rgb(var(--game-color-bg))"};`}>
		{#if active}
			<span class="active-indicator"></span>
		{/if}
		{#if icon}
			<svelte:component this={icon} color={"var(--icon-color)"} size={size} />
		{/if}
		<slot />
	</div>
	<Popover
		bind:open
		caret
		on:click:outside={(e) => {
			open = ref.contains(e.detail.target);
		}}
	>
		<slot name="popover"></slot>
	</Popover>
</div>


<style>
	.toolbar-button-container {
		position: relative;
		--button-border-radius: 5px;
	}

	.toolbar-button {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		column-gap: calc(var(--button-size) * 0.025rem);
		min-width: calc(var(--button-size) * 0.12rem);
		height: calc(var(--button-size) * 0.12rem);
		margin: 0;
		padding: 0;
		background-color: rgb(var(--game-color-bg));
		color: var(--game-color-highlight);
		border-width: 1px;
		border-style: solid;
		border-radius: var(--button-border-radius);
		cursor: pointer;
		overflow: hidden;
		--icon-color: var(--game-color-highlight);
	}
	
	.active, .toolbar-button:hover {
		background-color: var(--game-color-highlight);
		color: rgb(var(--game-color-bg));
		border-color: rgb(var(--game-color-bg)) !important;
		--icon-color: rgb(var(--game-color-bg));
	}

	:global(.toolbar-button svg) {
		margin: 0;
		padding: 0;
	}
	
	:global(.bx--popover-contents) {
		background-color: rgb(var(--game-color-bg));
		color: var(--game-color-highlight);
		border: 1px solid var(--game-color-highlight);
		border-radius: var(--button-border-radius);
		padding: 0.5rem 0.8rem;
	}
	
	:global(.bx--popover--caret.bx--popover--top .bx--popover-contents::before, .bx--popover--caret.bx--popover--top .bx--popover-contents::after) {
		border-bottom: 1px solid var(--game-color-highlight);
		border-right: 1px solid var(--game-color-highlight);
	}
</style>
