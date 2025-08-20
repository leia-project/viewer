import { _ } from "svelte-i18n";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from '@lukeed/uuid';
import { FloodLayerController, type Breach, type FloodToolSettings } from "../../layer-controller";
import type { Map } from "$lib/components/map-cesium/module/map";
import { NotificationLog } from "./notification-log";
import { EvacuationController } from "./game-elements/evacuation-controller";
import type { IGameConfig, ISavedGame } from "./models";
import { NotificationType } from "$lib/components/map-core/notifications/notification-type";
import type { MarvinApp } from "../../Marvin/marvin";
import { Cutscene, type CameraData, type ChinookPositions } from "./cutscene";
import { BackgroundMusic } from "./background-music";



export class Game {

	public static breachStartOffsetInHours: number = 4;

	public map: Map;
	public marvin?: MarvinApp;
	public gameConfig: IGameConfig;
	public breach: Breach;

	public notificationLog: NotificationLog;
	public forwarding: Writable<boolean> = writable(false);
	public startTime: number;
	public elapsedTime: Writable<number> = writable(-999); // Initialize to -999 to indicate not preparation phase
	public elapsedTimeSinceBreach: Readable<number> = derived(this.elapsedTime, ($t) => $t - Game.breachStartOffsetInHours);
	public inPreparationPhase: Readable<boolean> = derived(this.elapsedTime, ($t) => $t === -999);
	public timeGaps: Readable<{ before?: number, after?: number }> = derived(this.elapsedTime, ($t) => {
		const timeBefore = this.getAdjacentStep($t, "previous");
		const timeAfter = this.getAdjacentStep($t, "next");
		const before = timeBefore !== undefined ? $t - timeBefore : undefined;
		const after = timeAfter !== undefined ? timeAfter - $t : undefined;
		return { before, after };
	});

	public elapsedTimeDynamic: Writable<number>;
	public elapsedTimeDynamicSinceBreach: Readable<number>;
	public elapsedTimeDynamicFormatted: Readable<string>;
	private interval: NodeJS.Timeout | undefined;

	public floodLayerController: FloodLayerController;
	public evacuationController: EvacuationController;
	public loaded: Readable<boolean>;
	public started: boolean = false;

	constructor(map: Map, gameConfig: IGameConfig, breach: Breach, floodToolSettings: FloodToolSettings, marvin?: MarvinApp, savedGame?: ISavedGame) {
		this.map = map;
		this.marvin = marvin;
		this.gameConfig = gameConfig;
		this.notificationLog = new NotificationLog();
		
		this.breach = breach;
		this.floodLayerController = new FloodLayerController(map, floodToolSettings, writable(breach), writable(gameConfig.scenario));
		this.elapsedTimeDynamic = this.floodLayerController.time;
		this.elapsedTimeDynamicSinceBreach = derived(this.elapsedTimeDynamic, ($t) => $t - Game.breachStartOffsetInHours);
		this.elapsedTimeDynamicFormatted = derived(this.elapsedTimeDynamicSinceBreach, ($t) => this.getFormattedTime($t));

		this.floodLayerController.loadNewScenario(breach, gameConfig.scenario).then(() => {
			this.addFloodLayers();
		});
		this.evacuationController = new EvacuationController(this, this.floodLayerController);

		this.startTime = new Date(gameConfig.breachTimeDateString).getTime() - Game.breachStartOffsetInHours * 3600 * 1000;
		if (!gameConfig.preparationPhase) {
			this.startBreach();
		}
		this.elapsedTimeDynamic.subscribe((t) => {
			const realTime = get(this.inPreparationPhase) ? 
				this.getNoonishDutchTime()
				: this.startTime + t * 3600 * 1000;
			this.map.options.dateTime.set(realTime);
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

	public getAdjacentStep(time: number, direction: "next" | "previous"): number | undefined {
		const timesteps = this.gameConfig.timesteps;
		const stepIndex = timesteps.indexOf(time);
		if (stepIndex === -1) return undefined;

		if (direction === "next" && stepIndex < timesteps.length - 1) {
			return timesteps[stepIndex + 1];
		} else if (direction === "previous" && stepIndex > 0) {
			return timesteps[stepIndex - 1];
		}
		return undefined;
	}

	public changeStep(direction: "next" | "previous"): void {
		this.forwarding.set(true);
		this.elapsedTimeDynamic.set(get(this.elapsedTime));
		this.elapsedTime.update((value) => this.getAdjacentStep(value, direction) ?? value);
		this.notificationLog.send({
			title: "Game",
			message: `Time ${direction === "next" ? "forwarded" : "rewinded"} to ${get(this.elapsedTimeSinceBreach)} hours since breach.`,
			type: NotificationType.INFO
		});

		if (this.interval) {
			clearInterval(this.interval);
		}

		const newTime = get(this.elapsedTime);
		if (newTime !== get(this.elapsedTimeDynamic)) {
			this.map.flyTo(this.gameConfig.floodView);

			// For visual appeal:
			this.evacuationController.hexagonLayer.use2DMode.set(true);
			const hexagonAlpha = this.evacuationController.hexagonLayer.alpha;
			hexagonAlpha.set(Math.min(0.3, get(hexagonAlpha)));

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
		}

		this.save();
	}

	public flyHome(): void {
		this.map.flyTo(this.gameConfig.homeView);
	}

	public getFormattedTime(time: number): string {
		const totalMinutes = Math.floor(Math.abs(time) * 60);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		const sign = time < 0 ? "-" : "";
		return `${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
	}

	public save(): void {
		const gameData: ISavedGame = {
			uuid: uuidv4(),
			name: this.gameConfig.name,
			elapsedTime: get(this.elapsedTime),
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
		this.setStep(savedGame.elapsedTime);
	}
	
	private setStep(time: number): void {
		if (time < this.gameConfig.timesteps[0] || time >= this.gameConfig.timesteps[this.gameConfig.timesteps.length - 1]) {
			throw new Error("Invalid step index");
		}
		this.elapsedTime.set(time);
		this.elapsedTimeDynamic.set(time);
	}

	public startBreach(): void {
		this.setStep(this.gameConfig.timesteps[0]);
		this.notificationLog.send({
			title: "Scenario",
			message: this.gameConfig.scenarioDescription,
			type: NotificationType.WARN,
			duration: 20000
		});
		const breachLocation = new Cesium.Entity({
			position: Cesium.Cartesian3.fromDegrees(this.breach.geometry.coordinates[0], this.breach.geometry.coordinates[1]),
			billboard: {
				image: "/images/alert-icon.svg",
				scale: 0.3,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
			}
		});
		this.map.viewer.entities.add(breachLocation);
		this.flyHome();
	}

	private getNoonishDutchTime(): number {
		const d = new Date();
		d.setUTCHours(12, 0, 0, 0); // 13:00 Dutch time (UTC+2)
    	return d.getTime();
	}

	public start(): void {
		if (!this.started) {
			this.startCutscene().then(() => {
				this.flyHome();
				this.notificationLog.send({
					title: get(_)("game.welcome"),
					message: get(_)("game.notification.start"),
					type: NotificationType.INFO
				});
				setTimeout(() => {
					if (get(this.inPreparationPhase)) {
						this.notificationLog.send({
							title: get(_)("game.preparationPhase"),
							message: get(_)("game.notification.preparation"),
							type: NotificationType.INFO
						});
					}
				}, 5000);
				this.started = true;
			});
		}
	}

	public startCutscene(): Promise<void> {
		return new Promise((resolve) => {
			resolve();
		});

		let cameraData: CameraData = [
			{
				lon: 3.42941,
				lat: 51.53084,
				height: 77.66574,
				heading: 140.15362,
				pitch: -17.58288
			},
			{
				lon: 3.43852,
				lat: 51.52433,
				height: 77.66584,
				heading: 140.16072,
				pitch: -17.05859
			},
			{
				lon: 3.44941,
				lat: 51.51550,
				height: 77.66596,
				heading: 142.23190,
				pitch: -17.07877
			},
			{
				lon: 3.45811,
				lat: 51.51020,
				height: 77.66714,
				heading: 136.05081,
				pitch: -17.07877
			},
			{
				lon: 3.47779,
				lat: 51.50096,
				height: 77.66779,
				heading: 127.64374,
				pitch: -5.0
			},
			{
			    lon: 3.48169,
				lat: 51.49957,
				height: 77.66784,
				heading: 111.48933,
				pitch: 10.37024
			},
			{
				lon: 3.49384,
				lat: 51.50071,
				height: 116.92997,
				heading: 81.65274,
				pitch: 6.08778
			},
			{
				lon: 3.47914,
				lat: 51.49233,
				height: 314.19318,
				heading: 43.49485,
				pitch: -7.16892
			},
			{
				lon: 3.65420,
				lat: 51.41641,
				height: 6365.80323,
				heading: 0.0,
				pitch: -31.71540
			}
		];

		let chinookData: ChinookPositions = [
			{
				startLon: 3.54616, 
				startLat: 51.40575, 
				startHeight: 750, 
				endLon: 3.654, 
				endLat: 51.70507, 
				endHeight: 750
			},
			{
				startLon: 3.8926, 
				startLat: 51.5674, 
				startHeight: 750, 
				endLon: 3.6571, 
				endLat: 51.5737, 
				endHeight: 750
			},
			{
				startLon: 3.487, 
				startLat: 51.5624, 
				startHeight: 750, 
				endLon: 3.5991, 
				endLat: 51.5582, 
				endHeight: 750
			},
			{
				startLon: 3.655, 
				startLat: 51.5511, 
				startHeight: 750, 
				endLon: 3.5903, 
				endLat: 51.4998, 
				endHeight: 750
			}
		]
		let cut = new Cutscene(this.map, cameraData, chinookData);
		cut.startAnimation();
		const backgroundMusic: BackgroundMusic = new BackgroundMusic("/audio/background-cutscene-music.mp3", true);
		backgroundMusic.playMusic();
		// this.map.getContainer()
	}
}