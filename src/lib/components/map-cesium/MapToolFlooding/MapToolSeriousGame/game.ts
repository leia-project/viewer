import { writable, type Writable } from "svelte/store";


interface IGameStats {
	victims: number;
	evacuated: number;
}

const steps = [
	{
		id: 1,
		time: 4,
		title: "Introduction",
		cameraPosition: {}
	}
]

export class Game {

	private breach: any;
	private scenario: any;

	private step: Writable<number> = writable(0);

	public stats: IGameStats;

	constructor(breach: any, scenario: any) {
		this.breach = breach;
		this.scenario = scenario;
		this.stats = {
			victims: 92,
			evacuated: 240
		}
	}



}