<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import { Return } from "carbon-icons-svelte";
	import type { GameController } from "../game-controller";
	import GameStats from "./GameStats.svelte";
	import MarvinMenu from "../../Marvin/MarvinMenu.svelte";
	import type { MarvinApp } from "../../Marvin/marvin";

	export let gameController: GameController;
	export let marvinApp: MarvinApp;

	const inGame = gameController.inGame;

	const activeGame = gameController.active;

</script>


{#if $inGame && $activeGame}
	<div id="game-overlay">
		<div id="top-container">
			<div id="top-left">
				<div>
					<Button
						icon={Return}
						on:click={() => gameController.exit()}
					>Exit</Button>
				</div>
			</div>
			<div id="top-center">
				<GameStats game={$activeGame} />
			</div>
			<div id="top-right">
				<MarvinMenu app={marvinApp} />
			</div>
		</div>
		
		<div id="bottom-container">
			<div>bottom container</div>
		</div>
	</div>
{/if}

<style>

	#game-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	#top-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
	}
	#top-right {
		display: flex;
		justify-content: flex-end;
		padding: 1rem;
	}
	#top-left div {
		pointer-events: auto;
	}

	#bottom-container {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
	}

</style>