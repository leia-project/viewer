<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Layers, VehicleInsights, WaveHeight } from "carbon-icons-svelte";
	import type { GameController } from "../../module/game-controller";
	import Roles from "../Roles.svelte";
	import EvacuationOverview from "./evacuation-overview/EvacuationOverview.svelte";
	import FloodModelControl from "./FloodModelControl.svelte";
	import { onDestroy, onMount } from "svelte";
	import MenuContent from "./MenuContent.svelte";

	export let gameController: GameController;

	const activeGame = gameController.active;

	let selectedMenu: number | undefined;

	let menuRef: HTMLDivElement;
	function handleClickOutside(event: MouseEvent) {
		if (!menuRef.contains(event.target as Node)) {
			selectedMenu = undefined;
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
				<Roles {gameController} />
			{:else if selectedMenu === 1}
				<MenuContent title="Flood Model Control" icon={WaveHeight}>
					<FloodModelControl game={$activeGame} />
				</MenuContent>
			{:else if selectedMenu === 2}
				<MenuContent title="Evacuation Control" icon={VehicleInsights}>
					<EvacuationOverview game={$activeGame} />
				</MenuContent>
			{/if}
		</div>
		<div class="data-menu-items" class:open={selectedMenu !== undefined}>
			<Button
				kind="secondary"
				size="default"
				icon={Layers}
				iconDescription="Layer Manager"
				on:click={() => selectedMenu = selectedMenu === 0 ? undefined : 0}
			/>
			<Button
				kind="secondary"
				size="default"
				icon={WaveHeight}
				iconDescription="Flood Model"
				on:click={() => selectedMenu = selectedMenu === 1 ? undefined : 1}
			/>
			<Button
				kind="secondary"
				size="default"
				icon={VehicleInsights}
				iconDescription="Evacuation Overview"
				on:click={() => selectedMenu = selectedMenu === 2 ? undefined : 2}
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

	.data-menu-items.open::after {
		content: "";
		position: absolute;
		bottom: 100%;
		left: 0;
		width: 100px;
		height: 2px;
		background-color: var(--game-color-highlight);
		border-radius: 8px;
		pointer-events: none;
	}

</style>