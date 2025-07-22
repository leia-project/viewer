<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Layers, VehicleInsights, WaveHeight } from "carbon-icons-svelte";
	import type { GameController } from "../../module/game-controller";
	import Roles from "../Roles.svelte";
	import EvacuationOverview from "./evacuation-overview/EvacuationOverview.svelte";
	import FloodModelControl from "./FloodModelControl.svelte";
	import { onDestroy, onMount } from "svelte";

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
		{#if selectedMenu !== undefined}
			<div class="data-menu-content">
				{#if selectedMenu === 0}
					<Roles {gameController} />
				{:else if selectedMenu === 1}
					<FloodModelControl game={$activeGame} />
				{:else if selectedMenu === 2}
					<EvacuationOverview game={$activeGame} />
				{/if}
			</div>
		{/if}
		<div class="data-menu-items">
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
		max-width: 500px;
	}

</style>