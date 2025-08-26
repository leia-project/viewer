<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import { Compass, Home, Save } from "carbon-icons-svelte";
	import GameButton from "./general/GameButton.svelte";
	import type { Game } from "../module/game";

	export let game: Game;

	let showSave = false;
	let saveTimeout: NodeJS.Timeout;
	function onSave() {
		clearTimeout(saveTimeout);
		showSave = true;
		saveTimeout = setTimeout(() => {
			showSave = false;
		}, 800);
	}
	onMount(() => game.on("game-saved", onSave));
	onDestroy(() => game.off("game-saved", onSave));

</script>


<div class="map-controls">
	{#if showSave}
	<div class="game-saved" transition:fade={{ duration: 300 }}>
		<Save size={16} />
		<span>Auto save</span>
	</div>
	{/if}
	<GameButton
		icon={Home}
		hasTooltip={true}
		size={20}
		on:click={() => game.flyHome()}
	>
		<svelte:fragment slot="popover">{$_("game.startPosition")}</svelte:fragment>
	</GameButton>
	<GameButton
		icon={Compass}
		hasTooltip={true}
		size={20}
		on:click={() => game.flyHome()}
	>
		<svelte:fragment slot="popover">{$_("game.north")}</svelte:fragment>
	</GameButton>
</div>


<style>
	
	.map-controls {
		display: flex;
		gap: 0.6rem;
		padding: 0.25rem;
	}


	.game-saved {
		display: flex;
		align-items: center;
		column-gap: 0.35rem;
		font-size: 0.8rem;
		color: #a8a8a8;
		margin-right: 2rem;
	}

	

</style>