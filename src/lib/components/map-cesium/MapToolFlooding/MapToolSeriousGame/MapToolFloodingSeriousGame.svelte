<script lang="ts">
	import { getContext } from "svelte";
	import { writable, type Writable } from "svelte/store";
	import { GameConsole } from "carbon-icons-svelte";
	import Button from "$lib/components/ui/components/Button/Button.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { GameController } from "./game-controller";
	import { addMarvini18n } from "../Marvin/module/i18n/i18n-marvin";


	const { registerTool, selectedTool, map } = getContext<any>("mapTools");
	
	const icon: any = GameConsole;

	const tool = new MapToolMenuOption("flooding-serious-game", icon, "Serious Game - Floods", false);
	registerTool(tool);

	addMarvini18n();
	
	const gameController = new GameController(map);

	tool.settings.subscribe((settings?: any) => {
		if (settings) {
			// set levels
		}
	});

	
	let cachedGame: Writable<boolean> = writable(false);

	// to config (?):
	const levels = [
		{
			name: "Middelburg",
			description: "The city of Middelburg is under water. Can you save the city?",
			thumbnail: "https://via.placeholder.com/150",
			scenario: "HS-ds-470"
		},
		{
			name: "Schouwen-Duiveland",
			description: "The island of Schouwen-Duiveland is under water. Can you save the island?",
			thumbnail: "https://via.placeholder.com/150",
			scenario: "HS-ds-472"
		}
	];

</script>


{#if $selectedTool === tool}
	<div class="start-menu">
	{#if cachedGame}
		<span>Current game: <strong>Game 1</strong></span>
		<Button
			label="Play"
			on:click={() => {
				gameController.play();
			}}
		>Continue</Button>
	{/if}

	<div class="header">Levels</div>
	{#each levels as level}
		<div class="level">
			<div class="description">
				<h3>{level.name}</h3>
				<p>{level.description}</p>
			</div>

		</div>
	{/each}

	<Button
		label="Play"
		on:click={() => {
			gameController.play();
		}}
	>Start new game</Button>

	</div>
{/if}


<style>

	.start-menu {
		padding: 0.5rem;
	}

</style>