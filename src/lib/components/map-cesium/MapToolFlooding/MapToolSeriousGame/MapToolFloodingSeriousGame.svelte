<script lang="ts">
	import { getContext } from "svelte";
	import { writable, type Writable } from "svelte/store";
	import { GameConsole } from "carbon-icons-svelte";
	import Button from "$lib/components/ui/components/Button/Button.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { GameController } from "./module/game-controller";
	import { addMarvini18n } from "../Marvin/module/i18n/i18n-marvin";
	import type { IGameConfig, IGameSettings } from "./module/game-models";


	const { registerTool, selectedTool, map } = getContext<any>("mapTools");
	
	const icon: any = GameConsole;

	const tool = new MapToolMenuOption("flooding-serious-game", icon, "Serious Game - Floods", false);
	registerTool(tool);

	addMarvini18n();
	
	let gameController: GameController;

	tool.settings.subscribe((settings?: IGameSettings) => {
		if (settings) {
			gameController = new GameController(map, settings)
		}
	});

	
	let cachedGame: Writable<boolean> = writable(false);


	/*
	WSNoo-DP760 – 1 op 100,000
	OS-dp_165 – 1 op 3000
	WSNoo-DP155 – 1 op 30000
	Schelde-Rijnkanaal_19_KM 1 op 3000
	*/
	// to config (?):
	const levels: Array<IGameConfig> = [
		{
			name: "Middelburg",
			description: "The city of Middelburg is under water. Can you save the city?",
			thumbnail: "https://via.placeholder.com/150",
			breach: {
				type: "Feature",
				properties: {
					dijkring: "29",
					scenarios: [
						"100000"
					],
					name: "WSNoo-DP760"
				},
				geometry: {
					type: "Point",
					coordinates: [
						4.136564350767653,
						51.52539867663192
					]
				}
			},
			scenario: "100000"
		},
		{
			name: "Schouwen-Duiveland",
			description: "The island of Schouwen-Duiveland is under water. Can you save the island?",
			thumbnail: "https://via.placeholder.com/150",
			breach: {
				type: "Feature",
				properties: {
					dijkring: "27",
					scenarios: [
						"3000",
						"10000",
						"30000"
					],
					name: "27_OS-dp_1047"
				},
				geometry: {
					type: "Point",
					coordinates: [
						4.136564350767653,
						51.52539867663192
					]
				}
			},
			scenario: "30000"
		}
	];

</script>


{#if $selectedTool === tool && gameController}
	<div class="start-menu">
		{#if cachedGame}
			<span>Current game: <strong>Game 1</strong></span>
			<Button
				label="Play"
				on:click={() => {
					gameController.play(levels[0]);
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
				gameController.play(levels[0]);
			}}
		>Start new game</Button>
	</div>
{/if}


<style>

	.start-menu {
		padding: 1rem;
		border-radius: 0.5rem;
		max-width: 600px;
		margin: 2rem auto;
		text-align: start;
	}

	.start-menu .header {
		font-size: 1.25rem;
		font-weight: bold;
		color: var(--dark, #111827);
		margin-bottom: 1rem;
		text-align: center;
		margin-top: 2rem;
	}

	.level {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border: 1px solid var(--surface-200, #e5e7eb);
		border-radius: 0.375rem;
		background-color: var(--surface-100, #ffffff);
		margin-bottom: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.level .description h3 {
		font-size: 1.125rem;
		font-weight: bold;
		color: var(--primary-500, #007bff);
		margin: 0;
	}

	.level .description p {
		font-size: 0.875rem;
		color: var(--surface-800, #374151);
		margin: 0;
	}

	.start-menu span {
		display: block;
		font-size: 1rem;
		color: var(--surface-800, #374151);
		margin-bottom: 1rem;
		text-align: center;
	}

	.start-menu span strong {
		color: var(--primary-500, #007bff);
	}

</style>