import { get, writable, type Writable } from "svelte/store";
import { FloodLayerController, type Breach } from "../layer-controller";
import type { Map } from "$lib/components/map-cesium/module/map";


interface IGameStats {
	victims: number;
	evacuated: number;
}

const steps = [
	{
		time: 0,
		title: "Introduction",
		cameraPosition: {}
	},
	{
		time: 4,
		title: "Hour 3",
		cameraPosition: {}
	},
	{
		time: 6,
		title: "Hour 6",
		cameraPosition: {}
	},
	{
		time: 8,
		title: "Hour 12",
		cameraPosition: {}
	},
	{
		time: 12,
		title: "Hour 12",
		cameraPosition: {}
	}
];

export class Game {

	private breach: Breach;
	private scenario: string;

	private forwarding: Writable<boolean> = writable(false);
	private step: Writable<number> = writable(0);

	private floodLayerController: FloodLayerController;
	public startTime: Writable<number> = writable(0);
	public elapsedTime: Writable<number> = writable(0);
	private interval: NodeJS.Timeout | undefined;

	public stats: IGameStats;

	constructor(map: Map, breach: Breach, scenario: string) {
		this.breach = breach;
		this.scenario = scenario;
		this.stats = {
			victims: 92,
			evacuated: 240
		}
		const floodTool = map.toolSettings.find((tool: { id: string, settings: any}) => tool.id === "flooding");
		this.floodLayerController = new FloodLayerController(map, floodTool.settings, writable(undefined), writable(undefined));
		this.elapsedTime = this.floodLayerController.time;
		this.floodLayerController.loadNewScenario(breach, scenario).then(() => {
			this.load();
		});
	}

	public load(): void {
		this.addLayers();
	}

	public exit(): void {
		this.removeLayers();
		if (this.interval) {
			clearInterval(this.interval);
		}
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

	public changeStep(direction: "next" | "previous"): void {
		this.forwarding.set(true);
	
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
			this.elapsedTime.update((value) => {
				if (direction === "next") {
					return value + 0.5;
				} else if (value > newTime) {
					return value - 0.05;
				}
				return value;
			});
			if (get(this.elapsedTime) >= newTime) {
				this.forwarding.set(false);
				clearInterval(this.interval);
				this.interval = undefined;
			}
		}, 50);
	}

}