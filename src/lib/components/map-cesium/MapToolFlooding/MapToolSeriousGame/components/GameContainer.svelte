<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Compass, Menu } from "carbon-icons-svelte";
	import type { MarvinApp } from "../../Marvin/marvin";
	import type { GameController } from "../module/game-controller";
	import GameStats from "./GameStats.svelte";
	import MarvinMenu from "../../Marvin/MarvinMenu.svelte";
	import Roles from "./Roles.svelte";
	import TimeControl from "./TimeControl.svelte";
	import Notifications from "./notifications/Notifications.svelte";
	import StartMenu from "./StartMenu.svelte";

	export let gameController: GameController;
	export let marvinApp: MarvinApp;

	const inGame = gameController.inGame;

	const activeGame = gameController.active;

	$: notificationLog = $activeGame?.notificationLog;

	let showStartMenu = true;

</script>


{#if $inGame && $activeGame}
	<div id="game-container">
		<div id="top-left">
			{#key notificationLog}
				{#if notificationLog}
					<Notifications {notificationLog}>
						<svelte:fragment slot="extra-buttons">
							<Button
								icon={Compass}
								iconDescription="Start Position"
								tooltipPosition="right"
								size="default"
								kind="secondary"
								on:click={() => $activeGame.flyHome()}
							/>
							<Button
								icon={Menu}
								iconDescription="Menu"
								tooltipPosition="right"
								size="default"
								kind="secondary"
								on:click={() => showStartMenu = !showStartMenu}
							/>
						</svelte:fragment>

					</Notifications>
				{/if}
			{/key}
		</div>
		<div id="top-center">
			<GameStats game={$activeGame} />
		</div>
		<div id="top-right">
			<MarvinMenu app={marvinApp} />
		</div>
		<div id="bottom-left">
			<Roles {gameController}/>
		</div>
		<div id="bottom-right">
			<TimeControl game={$activeGame} />
		</div>
	</div>

	{#if showStartMenu}
		<StartMenu {gameController} bind:open={showStartMenu} />
	{/if}
{/if}

<style>
	#game-container {
		--game-bg: #212121;
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
	#bottom-right {
		position: absolute;
		bottom: 0;
		right: 0;
		display: flex;
		justify-content: flex-end;
	}
</style>