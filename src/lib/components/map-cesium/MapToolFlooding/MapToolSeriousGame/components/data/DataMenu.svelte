<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { slide } from "svelte/transition";
	import { Layers, ToolKit, TrafficEvent, WaveHeight } from "carbon-icons-svelte";
	import type { GameController } from "../../module/game-controller";
	import EvacuationOverview from "./evacuation-overview/EvacuationOverview.svelte";
	import FloodModelControl from "./FloodModelControl.svelte";
	import MenuContent from "./MenuContent.svelte";
	import GameButton from "../general/GameButton.svelte";
	import LayerManager from "../layer-manager/LayerManager.svelte";
	import MeasureOverview from "./measures/MeasureOverview.svelte";

	export let gameController: GameController;

	const activeGame = gameController.active;

	$: inPrepartionPhase = $activeGame?.inPreparationPhase;

	let selectedMenu: number | undefined;

	let menuRef: HTMLDivElement;
	function handleClickOutside(event: MouseEvent) {
		if (!menuRef.contains(event.target as Node)) {
			//selectedMenu = undefined;
		}
	}

	onMount(() => {
		document.addEventListener("mousedown", handleClickOutside);
	});
	onDestroy(() => {
		document.removeEventListener("mousedown", handleClickOutside);
	});

</script>


<div class="data-menu" bind:this={menuRef}>
	{#if $activeGame}
		<div class="data-menu-content">
			{#if selectedMenu === 0}
				<MenuContent title="Layer Manager" icon={Layers}>
					<LayerManager {gameController} />
				</MenuContent>
			{:else if selectedMenu === 1 && !$inPrepartionPhase}
				<MenuContent title="Flood Model Control" icon={WaveHeight}>
					<FloodModelControl game={$activeGame} />
				</MenuContent>
			{:else if selectedMenu === 2 && !$inPrepartionPhase}
				<MenuContent title="Evacuations" icon={TrafficEvent}>
					<EvacuationOverview game={$activeGame} />
				</MenuContent>
			{:else if selectedMenu === 3}
				<MenuContent title="Measures" icon={ToolKit}>
					<MeasureOverview game={$activeGame} />
				</MenuContent>
			{/if}
		</div>
		<div class="data-menu-items" class:open={selectedMenu !== undefined}>
			<GameButton
				icon={Layers}
				hasTooltip={false}
				active={selectedMenu === 0}
				on:click={() => selectedMenu = selectedMenu === 0 ? undefined : 0}
			/>
			{#if !$inPrepartionPhase}
				<div class="data-menu-items" transition:slide={{ duration: 800, axis: "y" }}>
					<GameButton
						icon={WaveHeight}
						hasTooltip={false}
						active={selectedMenu === 1}
						on:click={() => selectedMenu = selectedMenu === 1 ? undefined : 1}
					/>
					<GameButton
						icon={TrafficEvent}
						hasTooltip={false}
						active={selectedMenu === 2}
						on:click={() => selectedMenu = selectedMenu === 2 ? undefined : 2}
					/>
				</div>
			{/if}
			<GameButton
				icon={ToolKit}
				hasTooltip={false}
				active={selectedMenu === 3}
				on:click={() => selectedMenu = selectedMenu === 3 ? undefined : 3}
			/>
		</div>
	{/if}
</div>


<style>

	.data-menu {
		padding: 0.25rem;
	}

	.data-menu-content {
		position: absolute;
		bottom: 100%;
		left: 0;
		max-width: 500px;
	}

	.data-menu-items {
		display: flex;
		gap: 0.6rem;
		position: relative;
	}

	.data-menu-items.open::after {
		content: "";
		position: absolute;
		bottom: calc(100% + 1rem);
		left: 0;
		width: 100px;
		height: 2px;
		background-color: var(--game-color-highlight);
		border-radius: 8px;
		pointer-events: none;
	}

</style>