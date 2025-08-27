import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { MarvinApp, type Map, type LayerConfig, type Layer } from "../external-dependencies";

import { Game } from "./game";
import GameContainer from "../components/GameContainer.svelte";
import type { IGameConfig, ISeriousGameToolSettings, ISavedGame } from "./models";
import type { Breach, FloodToolSettings } from "../../layer-controller";


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

	public settings: ISeriousGameToolSettings;
	private floodToolSettings: FloodToolSettings;
	public breaches: Array<Breach>;

	private backgroundLayer: LayerConfig;
	private cachedMapLayersAdded: Array<Layer> = [];
	private cachedMapLayersVisible: Array<Layer> = [];
	private cachedTime: number = 0;

	public inGame: Writable<boolean> = writable(false);
	public savedGames: Writable<Array<ISavedGame>> = writable([]);

	public active: Writable<Game | undefined> = writable(undefined);
	private boundingDome: Cesium.Entity;

	constructor(map: Map, settings: ISeriousGameToolSettings, floodToolSettings: FloodToolSettings, breaches: Array<Breach>) {
		this.map = map;
		this.settings = settings;
		this.floodToolSettings = floodToolSettings;
		this.breaches = breaches;
		this.backgroundLayer = this.map.layerLibrary.findLayer(settings.backgroundLayerId) as LayerConfig;
		this.boundingDome = this.getBoundingDome();
	}

	public loadGame(gameConfig: IGameConfig, savedGame?: ISavedGame): void {
		const breach = this.breaches.find((b) => b.properties.name === gameConfig.breach);
		if (!breach) {
			console.error("Configured breach not found");
			return;
		}
		const game = new Game(this.map, gameConfig, breach, this.floodToolSettings, this.marvin, savedGame);
		this.active.set(game);
	}

	public play(gameConfig: IGameConfig, savedGame?: ISavedGame): void {
		this.inGame.set(true);
		this.cachedTime = get(this.map.options.dateTime);
		this.addGameLayers();
		this.toggleViewerUI(false);
		const marvin = this.initMarvin();
		this.loadUserInterface(marvin);
		this.loadGame(gameConfig, savedGame);
		this.map.viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
		//this.map.viewer.entities.add(this.boundingDome);
	}

	public exit(): void {   
		this.inGame.set(false);
		this.map.options.dateTime.set(this.cachedTime);
		this.removeGameLayers();
		this.toggleViewerUI(true);
		get(this.active)?.exit();
		this.active.set(undefined);
		this.gameContainer?.$destroy();
		this.map.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
		//this.map.viewer.entities.remove(this.boundingDome);
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

	private addGameLayers(): void {
		this.cachedMapLayersAdded = get(this.map.layers);
		this.cachedMapLayersVisible = this.cachedMapLayersAdded.filter((l) => get(l.visible));
		get(this.map.layers).forEach((layer) => {
			layer.visible.set(false);
		});
		if (this.backgroundLayer) {
			this.backgroundLayer.added.set(true);
			const layer = get(this.map.layers).find((l) => l.id === this.backgroundLayer?.id);
			layer?.visible.set(true);
		}
		this.settings.generalLayerIds.forEach((id) => {
			const layerConfig = this.map.layerLibrary.findLayer(id);
			if (layerConfig) {
				layerConfig.added.set(true);
				const layer = get(this.map.layers).find((l) => l.id === layerConfig.id);
				layer?.visible.set(false);
			}
		});
	}

	private removeGameLayers(): void {
		const cachedLayerIds = this.cachedMapLayersAdded.map((l) => l.id);
		if (!cachedLayerIds.includes(this.backgroundLayer.id)) {
			this.backgroundLayer.added.set(false);
		}
		this.settings.generalLayerIds.forEach((id) => {
			if (cachedLayerIds.includes(id)) return;
			const layer = this.map.layerLibrary.findLayer(id);
			if (layer) {
				layer.added.set(false);
			}
		});
		this.cachedMapLayersAdded.forEach((layer) => {
			if (this.cachedMapLayersVisible.includes(layer)) layer.visible.set(true);
		});
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
	}

	private getBoundingDome(): Cesium.Entity {
		const boundingDome = new Cesium.Entity({
			position: new Cesium.Cartesian3(0, 0, 0),
			ellipsoid: {
				radii: new Cesium.Cartesian3(100000000, 100000000, 100000000),
				material: Cesium.Color.DIMGRAY.withAlpha(0.9),
				fill: true
			}
		});
		return boundingDome;
	}

	public getGamesFromCache(): void {
		const cachedGames = localStorage.getItem("serious-game-flooding");
		if (cachedGames) {
			try {
				const savedGames = JSON.parse(cachedGames) as Array<ISavedGame>;
				this.savedGames.set(savedGames);
			} catch (error) {
				console.error("Error parsing saved games from cache:", error);
			}
		}
	}

	public deleteGameFromCache(uuid: string): void {
		const cachedGames = localStorage.getItem("serious-game-flooding");
		if (cachedGames) {
			try {
				const savedGames = JSON.parse(cachedGames) as Array<ISavedGame>;
				const updatedGames = savedGames.filter((game) => game.uuid !== uuid);
				localStorage.setItem("serious-game-flooding", JSON.stringify(updatedGames));
				this.savedGames.set(updatedGames);
			} catch (error) {
				console.error("Error deleting game from cache:", error);
			}
		}
	}
}