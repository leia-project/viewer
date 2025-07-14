<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Layers, VehicleInsights } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";
	import Roles from "../Roles.svelte";
	import EvacuationOverview from "./evacuation-overview/EvacuationOverview.svelte";
	import FloodModelControl from "./FloodModelControl.svelte";
	import { onDestroy, onMount } from "svelte";

	export let game: Game;

	let selectedMenu: number | undefined;

	let menuRef: HTMLDivElement;
	function handleClickOutside(event: MouseEvent) {
		console.log("Clicked outside menu", event.target);
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
	{#if selectedMenu !== undefined}
		<div class="data-menu-content">
			{#if selectedMenu === 0}
				<!--<Roles {game} />-->
			{:else if selectedMenu === 1}
				<FloodModelControl />
			{:else if selectedMenu === 2}
				<EvacuationOverview {game} />
			{/if}
		</div>
	{/if}
	<div class="data-menu-items">
		<Button
			kind="secondary"
			size="default"
			icon={Layers}
			iconDescription="Layer Manager"
			on:click={() => selectedMenu = 0}
		/>
		<Button
			kind="secondary"
			size="default"
			icon={Layers}
			iconDescription="Flood Model"
			on:click={() => selectedMenu = 1}
		/>
		<Button
			kind="secondary"
			size="default"
			icon={VehicleInsights}
			iconDescription="Evacuation Overview"
			on:click={() => selectedMenu = 2}
		/>
	</div>
</div>


<style>

	.data-menu-content {
		
	}

</style>