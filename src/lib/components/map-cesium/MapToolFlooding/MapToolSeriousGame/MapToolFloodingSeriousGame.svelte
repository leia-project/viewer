<script lang="ts">
	import { getContext } from "svelte";
	import { writable, type Writable } from "svelte/store";
	import { Button } from "carbon-components-svelte";
	import { GameConsole } from "carbon-icons-svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { GameController } from "./module/game-controller";
	import { addMarvini18n } from "../Marvin/module/i18n/i18n-marvin";
	import type { IGameConfig, IGameSettings } from "./module/models";


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
			outline: [ [ 3.742330998583845, 51.617116836834349 ], [ 3.832771457720317, 51.618890140512939 ], [ 3.914643873359651, 51.597014552212578 ], [ 3.939395999018054, 51.558558937024586 ], [ 4.086004743302441, 51.507036643032052 ], [ 4.1326529801202, 51.453676340213669 ], [ 4.238325516584921, 51.450710048249896 ], [ 4.259269622911262, 51.415693246459711 ], [ 4.233565492419844, 51.385402854916094 ], [ 4.200245323264301, 51.390749675829021 ], [ 4.127892955955123, 51.380649600703897 ], [ 3.966052134342488, 51.438249517278393 ], [ 3.947964042515193, 51.390749675829021 ], [ 3.867995636541891, 51.364009323129274 ], [ 3.53574594981948, 51.426379183754698 ], [ 3.397705249032233, 51.532508973185649 ], [ 3.526225901489325, 51.611796510047057 ], [ 3.742330998583845, 51.617116836834349 ] ],
			scenario: "100000"
		},
		{
			name: "Schouwen-Duiveland",
			description: "The island of Schouwen-Duiveland is under water. Can you save the island?",
			thumbnail: "https://via.placeholder.com/150",
			breach: {
				type: "Feature",
				properties: {
					dijkring: "26",
					scenarios: [
						"3000",
						"10000",
						"30000"
					],
					name: "OS-dp_165"
				},
				geometry: {
					type: "Point",
					coordinates: [
						4.136564350767653,
						51.52539867663192
					]
				}
			},
			outline:  [ [ 3.908931844361557, 51.62125443763307 ], [ 3.884179718703155, 51.625391661192239 ], [ 3.869899646207922, 51.65788529279974 ], [ 3.83848348671841, 51.670876226205841 ], [ 3.788979235401604, 51.676189625401641 ], [ 3.768035129075263, 51.661428644050218 ], [ 3.738522979251782, 51.656113513273027 ], [ 3.701394790764179, 51.654341664477322 ], [ 3.670930636107682, 51.66851451536774 ], [ 3.655698558779435, 51.695666756500877 ], [ 3.664266602276574, 51.724571888193069 ], [ 3.697586771432117, 51.749922400719491 ], [ 3.742330998583845, 51.755815830642149 ], [ 3.788027230568589, 51.756994424343411 ], [ 3.824203414223179, 51.753458550957276 ], [ 3.863235612376814, 51.749333015429819 ], [ 3.913691868526634, 51.754637206180199 ], [ 3.947964042515193, 51.749922400719491 ], [ 3.98223621650375, 51.739901804849119 ], [ 4.003180322830092, 51.725161596520167 ], [ 4.026028438822465, 51.705107197858354 ], [ 4.056492593478961, 51.695076663518343 ], [ 4.085052738469425, 51.683273188062458 ], [ 4.116468897958938, 51.676189625401641 ], [ 4.137413004285278, 51.666743151433757 ], [ 4.182157231437007, 51.656113513273027 ], [ 4.22785346342175, 51.647253576584141 ], [ 4.239277521417938, 51.642527568889861 ], [ 4.253557593913169, 51.628346589921478 ], [ 4.257365613245232, 51.610614130513383 ], [ 4.256413608412215, 51.582819344924523 ], [ 4.254509598746185, 51.562110049343495 ], [ 4.251653584247138, 51.540799215805052 ], [ 4.244989550416029, 51.527771013713256 ], [ 4.230709477920797, 51.494591489638651 ], [ 4.202149332930333, 51.487478447508835 ], [ 4.150741071947494, 51.493406059685746 ], [ 4.116468897958938, 51.504073819521622 ], [ 4.061252617644037, 51.51829361545925 ], [ 3.989852255167876, 51.560926376047561 ], [ 3.956532086012333, 51.604701770872794 ], [ 3.908931844361557, 51.62125443763307 ] ],
			scenario: "30000"
		},
		{
			name: "Middelburg-oost",
			description: "The island of Middelburg-oost is under water. Can you save the island?",
			thumbnail: "https://via.placeholder.com/150",
			breach: {
				type: "Feature",
				properties: {
					dijkring: "31",
					scenarios: [
						"3000",
						"10000",
						"30000"
					],
					name: "WSNoo-DP155"
				},
				geometry: {
					type: "Point",
					coordinates: [
						4.136564350767653,
						51.52539867663192
					]
				}
			},
			outline: [ [ 3.742330998583845, 51.617116836834349 ], [ 3.832771457720317, 51.618890140512939 ], [ 3.914643873359651, 51.597014552212578 ], [ 3.939395999018054, 51.558558937024586 ], [ 4.086004743302441, 51.507036643032052 ], [ 4.1326529801202, 51.453676340213669 ], [ 4.238325516584921, 51.450710048249896 ], [ 4.259269622911262, 51.415693246459711 ], [ 4.233565492419844, 51.385402854916094 ], [ 4.200245323264301, 51.390749675829021 ], [ 4.127892955955123, 51.380649600703897 ], [ 3.966052134342488, 51.438249517278393 ], [ 3.947964042515193, 51.390749675829021 ], [ 3.867995636541891, 51.364009323129274 ], [ 3.53574594981948, 51.426379183754698 ], [ 3.397705249032233, 51.532508973185649 ], [ 3.526225901489325, 51.611796510047057 ], [ 3.742330998583845, 51.617116836834349 ] ],
			scenario: "30000"
		},
		{
			name: "Tholen",
			description: "The island of Tholen is under water. Can you save the island?",
			thumbnail: "https://via.placeholder.com/150",
			breach: {
				type: "Feature",
				properties: {
					dijkring: "27",
					scenarios: [
						"300",
						"1000",
						"3000"
					],
					name: "Schelde-Rijnkanaal_19_KM"
				},
				geometry: {
					type: "Point",
					coordinates: [
						4.136564350767653,
						51.52539867663192
					]
				}
			},
			outline: [ [ 3.908931844361557, 51.62125443763307 ], [ 3.884179718703155, 51.625391661192239 ], [ 3.869899646207922, 51.65788529279974 ], [ 3.83848348671841, 51.670876226205841 ], [ 3.788979235401604, 51.676189625401641 ], [ 3.768035129075263, 51.661428644050218 ], [ 3.738522979251782, 51.656113513273027 ], [ 3.701394790764179, 51.654341664477322 ], [ 3.670930636107682, 51.66851451536774 ], [ 3.655698558779435, 51.695666756500877 ], [ 3.664266602276574, 51.724571888193069 ], [ 3.697586771432117, 51.749922400719491 ], [ 3.742330998583845, 51.755815830642149 ], [ 3.788027230568589, 51.756994424343411 ], [ 3.824203414223179, 51.753458550957276 ], [ 3.863235612376814, 51.749333015429819 ], [ 3.913691868526634, 51.754637206180199 ], [ 3.947964042515193, 51.749922400719491 ], [ 3.98223621650375, 51.739901804849119 ], [ 4.003180322830092, 51.725161596520167 ], [ 4.026028438822465, 51.705107197858354 ], [ 4.056492593478961, 51.695076663518343 ], [ 4.085052738469425, 51.683273188062458 ], [ 4.116468897958938, 51.676189625401641 ], [ 4.137413004285278, 51.666743151433757 ], [ 4.182157231437007, 51.656113513273027 ], [ 4.22785346342175, 51.647253576584141 ], [ 4.239277521417938, 51.642527568889861 ], [ 4.253557593913169, 51.628346589921478 ], [ 4.257365613245232, 51.610614130513383 ], [ 4.256413608412215, 51.582819344924523 ], [ 4.254509598746185, 51.562110049343495 ], [ 4.251653584247138, 51.540799215805052 ], [ 4.244989550416029, 51.527771013713256 ], [ 4.230709477920797, 51.494591489638651 ], [ 4.202149332930333, 51.487478447508835 ], [ 4.150741071947494, 51.493406059685746 ], [ 4.116468897958938, 51.504073819521622 ], [ 4.061252617644037, 51.51829361545925 ], [ 3.989852255167876, 51.560926376047561 ], [ 3.956532086012333, 51.604701770872794 ], [ 3.908931844361557, 51.62125443763307 ] ],
			scenario: "3000"
		}
	];
</script>


{#if $selectedTool === tool && gameController}
	<div class="start-menu">
		{#if cachedGame}
			<span>Current game: <strong>Game 1</strong></span>
			<Button
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