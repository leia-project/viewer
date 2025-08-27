<script lang="ts">
	import { getContext } from "svelte";
	import { GameConsole } from "carbon-icons-svelte";
	import { MapToolMenuOption, type Map, addMarvini18n } from "./external-dependencies";
	import { addSeriousGamei18n } from "./module/i18n/i18n-game";
	import { GameController } from "./module/game-controller";
	import type { ISeriousGameToolSettings } from "./module/models";
	import LevelSelect from "./components/LevelSelect.svelte";

	const { registerTool, selectedTool, map }: {
		registerTool: (tool: MapToolMenuOption) => void;
		selectedTool: any;
		map: Map;
	} = getContext<any>("mapTools");
	
	const icon: any = GameConsole;

	const tool = new MapToolMenuOption("flooding-serious-game", icon, "Serious Game - Floods", false, "600px");
	registerTool(tool);

	addMarvini18n();
	addSeriousGamei18n();

	let gameController: GameController;

	map.configLoaded.subscribe(async (loaded: boolean) => {
		const floodTool = map.toolSettings.find((tool: { id: string, settings: any}) => tool.id === "flooding");
		if (!floodTool) {
			console.error("Flooding tool settings not found. Settings are required to initialize the Serious Game.");
			return;
		}
		const breaches = await fetch(floodTool.settings.breachUrl).then((res) => res.json()).then((data) => data.features);
		tool.settings.subscribe((settings: ISeriousGameToolSettings) => {
			if (settings) {
				gameController = new GameController(map, settings, floodTool.settings, breaches);
			}
		});
	});


	// Cutscene recording:
	import { CutScene, startCutscene } from "./module/cutscene/cutscene";
	let cutscene: CutScene;
	document.onkeydown = function (e) {
		if (e.key === 'q') {
			cutscene = startCutscene(map, gameController, 1);
		}
		if (e.key === 'w') {
			cutscene?.stop();
		}
	};

</script>


{#if $selectedTool === tool && gameController}
	<LevelSelect {gameController} />
{/if}
