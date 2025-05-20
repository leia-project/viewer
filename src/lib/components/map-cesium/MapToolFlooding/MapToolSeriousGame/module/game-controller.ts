import { get, writable, type Writable } from "svelte/store";
import type { Map } from "$lib/components/map-cesium/module/map";
import { Game } from "./game";
import { MarvinApp } from "../../Marvin/marvin";
import GameContainer from "../components/GameContainer.svelte";
import type { IGameConfig, IGameSettings } from "./models";
import type { LayerConfig } from "$lib/components/map-core/layer-config";


const hiddenElements = [
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

	private backgroundLayer?: LayerConfig;
	private cachedMapLayers: Array<any> = [];

	public inGame: Writable<boolean> = writable(false);
	private savedGames: Array<Game> = [];

	public active: Writable<Game | undefined> = writable(undefined);

	constructor(map: Map, settings: IGameSettings) {
		this.map = map;
		this.backgroundLayer = this.map.layerLibrary.findLayer(settings.backgroundLayerId);
	}

	public loadGame(gameConfig: IGameConfig): void {
		const game = new Game(this.map, gameConfig.breach, gameConfig.scenario);
		this.active.set(game);
	}

	public play(gameConfig: IGameConfig): void {
		this.inGame.set(true);
		this.toggleViewerUI(false);
		const marvin = this.initMarvin();
		this.loadUserInterface(marvin);
		this.addBackgroundLayer();
		this.loadGame(gameConfig);
	}

	public exit(): void {   
		this.inGame.set(false);
		this.removeBackgroundLayer();
		this.toggleViewerUI(true);
		get(this.active)?.exit();
		this.active.set(undefined);
		this.gameContainer?.$destroy();
	}

	private loadUserInterface(marvin: MarvinApp): void {
		this.gameContainer?.$destroy();
		this.gameContainer = new GameContainer({
			target: this.map.getContainer(),
			props: {
				gameController: this,
				marvinApp: marvin
			}
		});
	}

	private addBackgroundLayer(): void {
		if (this.backgroundLayer) {
			this.backgroundLayer.added.set(true);
			const layer = get(this.map.layers).find((l) => l.id === this.backgroundLayer?.id);
			layer?.visible.set(true);
		}
	}

	private removeBackgroundLayer(): void {
		this.backgroundLayer?.added.set(false);
	}

	private initMarvin(): MarvinApp {
		if (!this.marvin) {
			this.marvin = new MarvinApp(this.map);
			this.marvin.init();
		}
		return this.marvin;
	}

	private toggleViewerUI(show: boolean): void {
		for (const hiddenElement of hiddenElements) {
			const el = document.getElementsByClassName(hiddenElement.name)[0] 
			if (el instanceof HTMLElement) {
				if (!show) hiddenElement.display = el.style.display;
				el.style.display = show ? hiddenElement.display : "none";
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