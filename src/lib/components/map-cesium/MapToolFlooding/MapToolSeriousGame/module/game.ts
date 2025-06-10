import { get, writable, type Writable } from "svelte/store";
import { FloodLayerController, type Breach } from "../../layer-controller";
import type { Map } from "$lib/components/map-cesium/module/map";
import { NotificationLog } from "./notification-log";
import { CameraLocation } from "$lib/components/map-core/camera-location";
import { EvacuationController } from "./game-elements/evacuation-controller";


interface IGameStats {
	victims: number;
	evacuated: number;
}

interface IGameStep {
	time: number;
	title: string;
	cameraPosition: CameraLocation;
}

const steps: Array<IGameStep> = [
	{
		time: 0,
		title: "Introduction",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	},
	{
		time: 4,
		title: "Hour 3",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	},
	{
		time: 6,
		title: "Hour 6",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	},
	{
		time: 8,
		title: "Hour 12",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	},
	{
		time: 12,
		title: "Hour 12",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	}
];

export class Game {

	private map: Map;
	private breach: Breach;
	private scenario: string;

	public notificationLog: NotificationLog;
	private forwarding: Writable<boolean> = writable(false);
	private step: Writable<number> = writable(0);
	public startTime: Writable<number> = writable(0);
	public elapsedTime: Writable<number> = writable(0);
	private interval: NodeJS.Timeout | undefined;

	private floodLayerController: FloodLayerController;
	public evacuationController: EvacuationController;

	public stats: IGameStats;

	constructor(map: Map, breach: Breach, scenario: string) {
		this.map = map;
		this.breach = breach;
		this.scenario = scenario;
		this.notificationLog = new NotificationLog();
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
		this.evacuationController = new EvacuationController(map, scenario, this.elapsedTime, breach.outline);
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
		this.notificationLog.send({
			title: "Game",
			message: `Time forwarded to ${steps[get(this.step)].title}`,
			type: "info"
		});
	
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
					return value + 0.1;
				} else if (value > newTime) {
					return value - 0.1;
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

	public flyHome(): void {
		const cameraPosition = steps[get(this.step)].cameraPosition;
		this.map.flyTo(cameraPosition);
	}
}