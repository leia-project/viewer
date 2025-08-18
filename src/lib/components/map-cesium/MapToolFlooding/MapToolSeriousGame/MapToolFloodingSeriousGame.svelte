<script lang="ts">
	import { getContext } from "svelte";
	import { GameConsole } from "carbon-icons-svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import { addMarvini18n } from "../Marvin/module/i18n/i18n-marvin";
	import { addSeriousGamei18n } from "./module/i18n/i18n-game";
	import { GameController } from "./module/game-controller";
	import type { IGameSettings } from "./module/models";
	import LevelSelect from "./components/LevelSelect.svelte";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");
	
	const icon: any = GameConsole;

	const tool = new MapToolMenuOption("flooding-serious-game", icon, "Serious Game - Floods", false, "600px");
	registerTool(tool);

	addMarvini18n();
	addSeriousGamei18n();
	
	let gameController: GameController;

	tool.settings.subscribe((settings?: IGameSettings) => {
		if (settings) {
			gameController = new GameController(map, settings)
		}
	});

</script>


{#if $selectedTool === tool && gameController}
	<LevelSelect {gameController} />
{/if}
