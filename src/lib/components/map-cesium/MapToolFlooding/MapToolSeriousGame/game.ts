import { get, writable, type Writable } from "svelte/store";
import type { Breach } from "../layer-controller";


interface IGameStats {
	victims: number;
	evacuated: number;
}

const steps = [
	{
		time: 4,
		title: "Introduction",
		cameraPosition: {}
	},
	{
		time: 18,
		title: "Hour 3",
		cameraPosition: {}
	},
	{
		time: 36,
		title: "Hour 6",
		cameraPosition: {}
	},
	{
		time: 72,
		title: "Hour 12",
		cameraPosition: {}
	}
];

export class Game {

	private breach: Breach;
	private scenario: string;

	private animating: Writable<boolean> = writable(false);
	private step: Writable<number> = writable(0);
	private time: Writable<number> = writable(0);
	private interval: NodeJS.Timeout | undefined;

	public stats: IGameStats;

	constructor(breach: Breach, scenario: string, time: Writable<number>) {
		this.breach = breach;
		this.scenario = scenario;
		this.stats = {
			victims: 92,
			evacuated: 240
		}
	}

	public changeStep(direction: "next" | "previous"): void {
		this.animating.set(true);
	
		this.step.update((value) => {
			if (direction === "next" && value < steps.length - 1) {
				return value + 1;
			} else if (direction === "previous" && value > 0) {
				return value - 1;
			}
			return value;
		});
	
		const newTime = steps[get(this.step)].time;
	
		if (this.interval) {
			clearInterval(this.interval);
		}
	
		this.interval = setInterval(() => {
			this.time.update((value) => {
				if (value < newTime) {
					return value + 0.05;
				} else if (value > newTime) {
					return value - 0.05;
				}
				return value;
			});
			if (get(this.time) === newTime) {
				this.animating.set(false);
				clearInterval(this.interval);
				this.interval = undefined;
			}
		}, 50);
	}

}