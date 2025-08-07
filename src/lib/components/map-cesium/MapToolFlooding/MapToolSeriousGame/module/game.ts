import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import { v4 as uuidv4 } from '@lukeed/uuid';
import { FloodLayerController, type Breach } from "../../layer-controller";
import type { Map } from "$lib/components/map-cesium/module/map";
import { NotificationLog } from "./notification-log";
import { CameraLocation } from "$lib/components/map-core/camera-location";
import { EvacuationController } from "./game-elements/evacuation-controller";
import type { IGameConfig, ISavedGame } from "./models";
import { NotificationType } from "$lib/components/map-core/notifications/notification-type";
import type { MarvinApp } from "../../Marvin/marvin";
import { Cutscene, type CameraData, type ChinookPositions } from "./cutscene";


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
		title: "Hour 8",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	},
	{
		time: 12,
		title: "Hour 12",
		cameraPosition: new CameraLocation(4.45092, 49.07338, 174273.52797, 6.35918, -28.59832, 1.5)
	}
];

export class Game {

	public map: Map;
	public marvin?: MarvinApp;
	public gameConfig: IGameConfig;

	public notificationLog: NotificationLog;
	public forwarding: Writable<boolean> = writable(false);
	public startTime: number;
	private step: Writable<number> = writable(0);
	public currentStep: Readable<IGameStep> = derived(this.step, ($step) => steps[$step]);
	public elapsedTime: Writable<number> = writable(0);
	public elapsedTimeDynamic: Writable<number>;
	public elapsedTimeFormatted: Readable<string> = derived(this.elapsedTime, ($elapsedTime) => this.getFormattedTime($elapsedTime));
	private interval: NodeJS.Timeout | undefined;

	public floodLayerController: FloodLayerController;
	public evacuationController: EvacuationController;
	public loaded: Readable<boolean>;

	constructor(map: Map, gameConfig: IGameConfig, marvin?: MarvinApp, savedGame?: ISavedGame) {
		this.map = map;
		this.marvin = marvin;
		this.gameConfig = gameConfig;
		this.notificationLog = new NotificationLog();
		
		const activeBreach: Writable<Breach | undefined> = writable(gameConfig.breach);
		const selectedScenario: Writable<string | undefined> = writable(gameConfig.scenario);

		const floodTool = map.toolSettings.find((tool: { id: string, settings: any}) => tool.id === "flooding");
		this.floodLayerController = new FloodLayerController(map, floodTool.settings, activeBreach, selectedScenario);
		this.elapsedTimeDynamic = this.floodLayerController.time;
		this.floodLayerController.loadNewScenario(gameConfig.breach, gameConfig.scenario).then(() => {
			this.addFloodLayers();
		});
		this.evacuationController = new EvacuationController(this, this.floodLayerController);
		this.step.subscribe((value) => {
			this.elapsedTime.set(steps[value].time);
		});
		this.startTime = new Date(gameConfig.breachTimeDateString).getTime();
		this.elapsedTimeDynamic.subscribe((t) => {
			this.map.options.dateTime.set(this.startTime + t * 3600 * 1000);
		});

		this.loaded = derived(
			[this.floodLayerController.floodLayer.loaded, this.evacuationController.hexagonLayer.loaded, this.evacuationController.roadNetwork.loaded],
			([$f, $h, $r]) => {
				return $f && $h && $r;
			}
		);

		const loadedUnsubscriber = this.loaded.subscribe((loaded) => {
			if (loaded) {
				if (savedGame) this.setSavedState(savedGame);
				loadedUnsubscriber();
			}
		});
	}

	public exit(): void {
		this.removeFloodLayers();
		if (this.interval) {
			clearInterval(this.interval);
		}
	}

	private addFloodLayers(): void {
		this.floodLayerController.floodLayer.addToMap();
		this.floodLayerController.floodedRoadsLayer.addToMap();
		this.floodLayerController.floodLayer.show();
		this.floodLayerController.floodedRoadsLayer.show();
		this.floodLayerController.addTimeSubscriber();
	}

	private removeFloodLayers(): void {
		this.floodLayerController.floodLayer.removeFromMap();
		this.floodLayerController.floodedRoadsLayer.removeFromMap();
		this.floodLayerController.floodLayer.hide();
		this.floodLayerController.floodedRoadsLayer.hide();
	}

	public changeStep(direction: "next" | "previous"): void {
		this.forwarding.set(true);
		this.elapsedTimeDynamic.set(get(this.currentStep).time);
		this.step.update((value) => {
			if (direction === "next" && value < steps.length - 1) {
				return value + 1;
			} else if (direction === "previous" && value > 0) {
				return value - 1;
			}
			return value;
		});
		this.notificationLog.send({
			title: "Game",
			message: `Time ${direction === "next" ? "forwarded" : "rewinded"} to ${steps[get(this.step)].title}`,
			type: NotificationType.INFO
		});

		const newTime = steps[get(this.step)].time;

		if (this.interval) {
			clearInterval(this.interval);
		}

		this.interval = setInterval(() => {
			this.elapsedTimeDynamic.update((value) => {
				if (direction === "next") {
					return Math.min(value + 0.1, newTime);
				} else if (direction === "previous") {
					return Math.max(value - 0.1, newTime);
				} else if (value > newTime) {
					return value - 0.1;
				}
				return value;
			});
			if (
				(direction === "next" && get(this.elapsedTimeDynamic) >= newTime) ||
				(direction === "previous" && get(this.elapsedTimeDynamic) <= newTime)
			) {
				this.forwarding.set(false);
				this.elapsedTimeDynamic.set(newTime);
				clearInterval(this.interval);
				this.interval = undefined;
			}
		}, 50);

		this.save();
	}

	private setStep(step: number): void {
		if (step < 0 || step >= steps.length) {
			throw new Error("Invalid step index");
		}
		this.step.set(step);
		this.elapsedTime.set(steps[step].time);
		this.elapsedTimeDynamic.set(steps[step].time);
	}

	public flyHome(): void {
		const cameraPosition = steps[get(this.step)].cameraPosition;
		this.map.flyTo(cameraPosition);
	}

	public getFormattedTime(time: number): string {
		const totalMinutes = Math.floor(time * 60);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours}:${minutes.toString().padStart(2, "0")}`;
	}

	public save(): void {
		const gameData: ISavedGame = {
			uuid: uuidv4(),
			name: this.gameConfig.name,
			step: get(this.step),
			evacuationLog: this.evacuationController.evacuationLog,
			lastUpdate: Date.now()
		};
		const gameCache = localStorage.getItem("serious-game-flooding");
		const savedGames: Array<ISavedGame> = gameCache ? JSON.parse(gameCache) : [];
		const saveGame = savedGames?.find((game) => game.name === gameData.name);
		if (saveGame) {
			const index = savedGames.indexOf(saveGame);
			savedGames[index] = gameData;
		} else {
			savedGames.push(gameData);
		}
		localStorage.setItem("serious-game-flooding", JSON.stringify(savedGames));
	}

	public setSavedState(savedGame: ISavedGame): void {
		savedGame.evacuationLog.forEach((logEntry) => {
			if (logEntry.added) {
				const hexagon = this.evacuationController.hexagonLayer.hexagons.find((h) => h.hex === logEntry.hexagonId);
				const extractionPoint = this.evacuationController.roadNetwork.roadNetworkLayer.getItemById(logEntry.extractionPointId);
				if (hexagon && extractionPoint) {
					this.evacuationController.evacuate(hexagon, extractionPoint, logEntry.evacuated);
				}
			} else {
				const evacuation = get(this.evacuationController.evacuations).find((e) => e.hexagon.hex === logEntry.hexagonId && e.extractionPoint.id === logEntry.extractionPointId);
				if (evacuation) this.evacuationController.deleteEvacuation(evacuation, false);
			}
		});
		this.evacuationController.roadNetwork.cleanSetRoutingGraph(get(this.elapsedTime));
		this.setStep(savedGame.step);
	}

	public startCutscene() {
		let cameraData: CameraData = [[4.5, 52.53, 1000, 270, -45.0], [52.53, 4.5, 500, 270, -45.0]];
		let chinookData: ChinookPositions = [
			{
				startLon: 4.5, 
				startLat: 52.53, 
				startHeight: 15000, 
				endLon: 5.0, 
				endLat: 52.53, 
				endHeight: 15000
			},
			{
				startLon: 4.5, 
				startLat: 52.73, 
				startHeight: 15000, 
				endLon: 5.0, 
				endLat: 52.73, 
				endHeight: 15000
			}
		]
		let cut = new Cutscene(this.map, cameraData, chinookData);
		cut.startAnimation();
	}
}