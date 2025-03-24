import { writable, type Writable } from "svelte/store";
import type { Map } from "../../module/map";
import { Game } from "./game";


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

	private map: Map;
	public inGame: Writable<boolean> = writable(false);
	private savedGames: any[] = [];

	public active: Writable<Game | undefined> = writable(undefined);

	constructor(map: Map) {
		this.map = map;
		this.active.set(new Game("breach", "scenario"));
	}


	public play(): void {
		this.inGame.set(true);
		this.toggleViewerUI(false);
	}

	public exit(): void {   
		this.inGame.set(false);
		this.toggleViewerUI(true);
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