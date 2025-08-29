<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { slide } from "svelte/transition";

	export let title: string;
	export let icon: any;

	const dispatch = createEventDispatcher();
	
</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="menu-content" in:slide={{ duration: 300, easing: t => t * (2 - t) }}>
	<div class="data-menu-header">
		<div class="data-menu-icon" on:click={() => dispatch("icon-clicked")}>
			<svelte:component this={icon} size={20} color={"rgb(var(--game-color-bg))"} />
		</div>
		<span>{title}</span>
	</div>
	<slot />
</div>


<style>

	.menu-content {
		background-color: rgba(var(--game-color-bg), 0.8);
		border-top-right-radius: 8px;
		color: var(--game-color-text);
		padding: 1rem 1rem 2rem;
	}
	
	.data-menu-header {
		font-weight: 700;
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.data-menu-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background-color: var(--game-color-highlight);
		border-radius: 50%;
		cursor: help;
	}

	.data-menu-icon:hover {
		filter: brightness(1.2);
	}

</style>