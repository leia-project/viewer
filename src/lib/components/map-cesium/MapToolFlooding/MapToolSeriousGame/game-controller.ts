import { get, writable, type Writable } from "svelte/store";
import type { Map } from "../../module/map";
import { Game } from "./game";
import { MarvinApp } from "../Marvin/marvin";
import GameContainer from "./game-ui/GameContainer.svelte";
import { FloodLayerController } from "../layer-controller";
import type { IGameConfig } from "./game-models";


const hidedElements = [
	{
		name: "tosti-tool-menu", 
		display: ""
	}, 
	{
		name: "bottom-right",
		display: ""
	}
];


export class GameController {

	public map: Map;
	private gameContainer?: GameContainer;
	private marvin?: MarvinApp;

	private cachedMapLayers: Array<any> = [];

	public inGame: Writable<boolean> = writable(false);
	private savedGames: Array<Game> = [];

	public active: Writable<Game | undefined> = writable(undefined);

	private floodLayerController: FloodLayerController;
	public time: Writable<number>;

	constructor(map: Map) {
		this.map = map;
		const floodTool = map.toolSettings.find((tool: { id: string, settings: any}) => tool.id === "flooding");
		this.floodLayerController = new FloodLayerController(map, floodTool.settings, writable(undefined), writable(undefined));
		this.time = this.floodLayerController.time;
	}

	public loadGame(gameConfig: IGameConfig): void {
		const game = new Game(gameConfig.breach, gameConfig.scenario, this.time);
		this.floodLayerController.loadNewScenario(gameConfig.breach, gameConfig.scenario).then(() => {
			this.addLayers();
		});
		this.active.set(game);
	}

	public play(gameConfig: IGameConfig): void {
		this.inGame.set(true);
		this.toggleViewerUI(false);
		this.initMarvin();
		this.loadUserInterface();
		this.loadGame(gameConfig);
	}

	public exit(): void {   
		this.inGame.set(false);
		this.removeLayers();
		this.toggleViewerUI(true);
		this.gameContainer?.$destroy();
	}

	private loadUserInterface(): void {
		this.gameContainer?.$destroy();
		this.gameContainer = new GameContainer({
			target: this.map.getContainer(),
			props: {
				gameController: this,
				marvinApp: this.marvin
			}
		});
	}

	private addLayers(): void {
		this.floodLayerController.floodLayer.addToMap();
		this.floodLayerController.floodedRoadsLayer.addToMap();
		this.floodLayerController.floodLayer.show();
		this.floodLayerController.floodedRoadsLayer.show();
	}

	private removeLayers(): void {
		this.floodLayerController.floodLayer.removeFromMap();
		this.floodLayerController.floodedRoadsLayer.removeFromMap();
		this.floodLayerController.floodLayer.hide();
		this.floodLayerController.floodedRoadsLayer.hide();
	}

	private initMarvin(): void {
		if (!this.marvin) {
			this.marvin = new MarvinApp(this.map);
			this.marvin.init();
		}
	}

	private toggleViewerUI(show: boolean): void {
		for (const hidedElement of hidedElements) {
			const el = document.getElementsByClassName(hidedElement.name)[0] 
			if (el instanceof HTMLElement) {
				if (!show) hidedElement.display = el.style.display;
				el.style.display = show ? hidedElement.display : "none";
			}
		}
		const main = document.getElementsByClassName("main")[0];
		if (main instanceof HTMLElement) {
			const header = main.querySelector(":scope > header");
			if (header instanceof HTMLElement) {
				header.style.display = show ? "" : "none";
			}
			const view = main.querySelector(":scope > .view");
			if (view instanceof HTMLElement) {
				view.style.paddingTop = show ? "3rem" : "0";
			}
		}
		if (!show) {
			this.cachedMapLayers = get(this.map.layers);
		}
		this.cachedMapLayers.forEach((layer) => {
			layer.visible.set(show);
		});
	}
}