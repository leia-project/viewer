import { writable, type Writable } from "svelte/store";
import type { Map } from "../../module/map";
import { Game } from "./game";
import { MarvinApp } from "../Marvin/marvin";
import GameContainer from "./game-ui/GameContainer.svelte";


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

	public inGame: Writable<boolean> = writable(false);
	private savedGames: any[] = [];

	public active: Writable<Game | undefined> = writable(undefined);

	constructor(map: Map) {
		this.map = map;
		this.active.set(new Game("breach", "scenario"));
		console.log("this.active.geasdfsdafsfdasfdasfdasfdat()");
	}


	public play(): void {
		this.inGame.set(true);
		this.toggleViewerUI(false);
		this.initMarvin();
		this.loadUserInterface();
	}

	public exit(): void {   
		this.inGame.set(false);
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

	private initMarvin(): void {
		if (!this.marvin) {
			this.marvin = new MarvinApp(this.map);
			this.marvin.init();
		}
		console.log(this.marvin);
	}

	private toggleViewerUI(show: boolean): void {
		for (const hidedElement of hidedElements) {
			const el = document.getElementsByClassName(hidedElement.name)[0] 
			if (el instanceof HTMLElement) {
				if (!show) hidedElement.display = el.style.display;
				el.style.display = show ? hidedElement.display : "none";
			}
		}
	}
}