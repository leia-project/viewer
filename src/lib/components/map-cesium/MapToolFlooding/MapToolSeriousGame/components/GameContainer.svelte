<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Compass, Home, Exit } from "carbon-icons-svelte";
	import type { MarvinApp } from "../../Marvin/marvin";
	import type { GameController } from "../module/game-controller";
	import GameStats from "./GameStats.svelte";
	import MarvinMenu from "../../Marvin/MarvinMenu.svelte";
	import Roles from "./Roles.svelte";
	import TimeControl from "./TimeControl.svelte";
	import Notifications from "./notifications/Notifications.svelte";
	import StartMenu from "./StartMenu.svelte";
	import EvacuationOverview from "./logging/EvacuationOverview.svelte";

	export let gameController: GameController;
	export let marvinApp: MarvinApp;

	const inGame = gameController.inGame;
	const activeGame = gameController.active;

	let showStartMenu = true;

</script>


{#if $inGame && $activeGame}
	{#key $activeGame}
		<div id="game-container">
			<div id="top-left">
				<Notifications notificationLog={$activeGame.notificationLog}>
					<svelte:fragment slot="extra-buttons">
						<Button
							icon={Home}
							iconDescription="Start Position"
							tooltipPosition="right"
							size="default"
							kind="secondary"
							on:click={() => $activeGame.flyHome()}
						/>
						<Button
							icon={Compass}
							iconDescription="Zoom to North"
							tooltipPosition="right"
							size="default"
							kind="secondary"
							on:click={() => $activeGame.flyHome()}
						/>
						<Button
							icon={Exit}
							iconDescription="Menu"
							tooltipPosition="right"
							size="default"
							kind="secondary"
							on:click={() => showStartMenu = !showStartMenu}
						/>
					</svelte:fragment>
				</Notifications>
			</div>
			<div id="top-center">
				<GameStats game={$activeGame} />
			</div>
			<div id="top-right">
				<MarvinMenu app={marvinApp} />
			</div>
			<div id="bottom-left">
				<Roles {gameController} />
			</div>
			<div id="bottom-center">
				<TimeControl game={$activeGame} />
			</div>
			<div id="bottom-right">
				<EvacuationOverview game={$activeGame} />
			</div>

			{#if showStartMenu}
				<StartMenu {gameController} bind:open={showStartMenu} />
			{/if}
		</div>
	{/key}
{/if}


<style>
	
	#game-container {
		--game-color-bg: 33, 33, 33;
		--game-color-contrast: #f0f0f0;
		--game-color-highlight: #ff9800;
		--game-color-text: #ffffff;
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
		display: flex;
		justify-content: flex-end;
		padding: 1rem;
		max-height: 80vh;
		overflow-y: auto;
	}

	#bottom-left {
		position: absolute;
		bottom: 0;
		left: 0;
		display: flex;
		justify-content: flex-start;
	}
	 #bottom-center {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		justify-content: center;
	}
	#bottom-right {
		position: absolute;
		bottom: 0;
		right: 0;
		display: flex;
		justify-content: flex-end;
	}
</style>