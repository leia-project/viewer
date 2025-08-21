<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { Exit } from "carbon-icons-svelte";
	import type { MarvinApp } from "../../Marvin/marvin";
	import type { GameController } from "../module/game-controller";
	import GameStats from "./GameStats.svelte";
	import MarvinMenu from "../../Marvin/MarvinMenu.svelte";
	import TimeControl from "./TimeControl.svelte";
	import Notifications from "./notifications/Notifications.svelte";
	import StartMenu from "./start/StartMenu.svelte";
	import MapControls from "./MapControls.svelte";
	import DataMenu from "./data/DataMenu.svelte";
	import GameButton from "./general/GameButton.svelte";
	import InfoModal from "./modal/InfoModal.svelte";

	export let gameController: GameController;
	export let marvinApp: MarvinApp;

	const inGame = gameController.inGame;
	const activeGame = gameController.active;

	$: inPreparationPhase = $activeGame?.inPreparationPhase;

	let showStartMenu = true;

	onMount(() => {
		const cesiumContainerClass = "cesiumContainer ";
		const el = document.getElementsByClassName(cesiumContainerClass)[0];
		if (el instanceof HTMLElement) {
			el.classList.add("serious-game-loaded");
		}
	});

	onDestroy(() => {
		const cesiumContainerClass = "cesiumContainer ";
		const el = document.getElementsByClassName(cesiumContainerClass)[0];
		if (el instanceof HTMLElement) {
			el.classList.remove("serious-game-loaded");
		}
	});

</script>


{#if $inGame && $activeGame}
	{#key $activeGame}
		<div id="game-container">
			<div id="top-left">
				<Notifications notificationLog={$activeGame.notificationLog}>
					<svelte:fragment slot="extra-buttons">
						<GameButton
							icon={Exit}
							hasTooltip={false}
							size={24}
							borderHighlight={true}
							on:click={() => showStartMenu = !showStartMenu}
						/>
					</svelte:fragment>
				</Notifications>
			</div>
			<div id="top-center">
				{#if !$inPreparationPhase}
					<GameStats game={$activeGame} />
				{/if}
			</div>
			<div id="top-right">
				<MarvinMenu app={marvinApp} />
			</div>
			<div id="bottom">
				<div id="bottom-left">
					<DataMenu {gameController} />
				</div>
				<div id="bottom-center">
					<TimeControl game={$activeGame} />
				</div>
				<div id="bottom-right">
					<MapControls game={$activeGame} />
				</div>
			</div>

			{#if showStartMenu}
				<StartMenu {gameController} bind:open={showStartMenu} />
			{/if}

			<InfoModal game={$activeGame} />
		</div>
	{/key}
{/if}


<style>

	:global(.serious-game-loaded .fiView) {
		right: 1rem !important;
		left: auto !important;
		bottom: calc(58px + 1rem) !important;
	}

	#game-container {
		--game-color-bg: 33, 33, 33;
		--game-color-contrast: #f0f0f0;
		--game-color-highlight: #9ccddc;
		--game-color-text: #ffffff;
	}
	#game-container > div {
		z-index: 10;
	}

	#top-left {
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		justify-content: flex-start;
	}
	#top-center {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		justify-content: center;
	}
	#top-right {
		position: absolute;
		top: 0;
		right: 0;
		padding: 1rem;
		max-height: 80vh;
		overflow-y: auto;
		overflow-x: hidden;
		pointer-events: none;
	}

	#bottom {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		background-color: rgba(var(--game-color-bg), 0.8);
		backdrop-filter: blur(10px);
		padding: 0.25rem;
		color: var(--game-color-text);
	}
	#bottom-right {
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}
</style>