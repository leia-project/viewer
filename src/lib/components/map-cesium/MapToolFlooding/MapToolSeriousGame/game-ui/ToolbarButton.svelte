<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { Popover } from "carbon-components-svelte";
	
	const dispatch = createEventDispatcher();
	
	export let icon: any = undefined;
	export let active: boolean | undefined = undefined;
	export let hasTooltip: boolean = false;
	let open: boolean = true;
	let ref: any = null;
	
	export function click() {
		const slot = ref.querySelector(`[slot="popover"]`);
		if (slot) {
			open = !open;
		}
		dispatch("click");
	}

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div bind:this={ref} on:mouseenter={() => open = hasTooltip} on:mouseleave={() => open = false}>
	<div class="toolbar-button" on:click={click} class:active={active}>
		<div>
			{#if icon}
			<svelte:component this={icon} />
			{/if}
			<slot></slot>
		</div>
	</div>
	
	<Popover
		bind:open
		caret
		on:click:outside={({ detail }) => {
			open = ref.contains(detail.target);
		}}
		>
		<div style="padding: var(--cds-spacing-05)">
			<slot name="popover"></slot>
		</div>
	</Popover>
</div>


<style>
	.toolbar-button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 2.8rem;
		height: 2.8rem;
		margin: 0;
		padding: 0;
		background-color: var(--theme-background);
		color: var(--theme-foreground);
		border: 1px solid var(--theme-foreground-fainter);
		border-radius: var(--border-radius);
		cursor: pointer;
		overflow: hidden;
	}
	
	.toolbar-button:hover {
		background-color: var(--theme-background-alt);
	}
	
	.active {
		border: 1px solid var(--theme-accent);
	}
	
	:global(.toolbar-button svg) {
		width: 24px;
		height: 24px;
		margin: 0;
		padding: 0;
	}
	
	:global(.bx--popover-contents) {
		background-color: var(--theme-background);
		color: var(--theme-foreground);
		border: 1px solid var(--theme-foreground-fainter);
		border-radius: var(--border-radius);
	}
	
	:global(.bx--popover--caret.bx--popover--top .bx--popover-contents::before, .bx--popover--caret.bx--popover--top .bx--popover-contents::after) {
		border-bottom: 1px solid var(--theme-foreground-fainter);
		border-right: 1px solid var(--theme-foreground-fainter);
	}
</style>
