<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Exit } from "carbon-icons-svelte";
	import type { MarvinApp } from "../../Marvin/marvin";
	import type { GameController } from "../game-controller";
	import GameStats from "./GameStats.svelte";
	import MarvinMenu from "../../Marvin/MarvinMenu.svelte";
	import Roles from "./Roles.svelte";
	import TimeControl from "./TimeControl.svelte";

	export let gameController: GameController;
	export let marvinApp: MarvinApp;

	const inGame = gameController.inGame;

	const activeGame = gameController.active;

</script>


{#if $inGame && $activeGame}
	<div id="game-container">
		<div id="top-left">
			<Button
				icon={Exit}
				iconDescription="Exit game"
				tooltipPosition="right"
				kind="secondary"
				on:click={() => gameController.exit()}
			/>
		</div>
		<div id="top-center">
			<GameStats game={$activeGame} />
		</div>
		<div id="top-right">
			<MarvinMenu app={marvinApp} />
		</div>
		<div id="bottom-left">
			<Roles />
		</div>
		<div id="bottom-right">
			MAPCONTROLS WHERE?
			<TimeControl game={$activeGame} />
		</div>
	</div>
{/if}

<style>

	#game-container {
		/* position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%; */
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
		padding: 1rem;
	}
	#top-right {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		justify-content: flex-end;
		padding: 1rem;
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