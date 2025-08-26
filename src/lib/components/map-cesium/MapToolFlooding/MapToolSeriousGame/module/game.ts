import type { ComponentType } from "svelte";
import { _ } from "svelte-i18n";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from '@lukeed/uuid';
import { Dispatcher } from "$lib/components/map-core/event/dispatcher";
import type { Map } from "$lib/components/map-cesium/module/map";
import { FloodLayerController, type Breach, type FloodToolSettings } from "../../layer-controller";
import type { MarvinApp } from "../../Marvin/marvin";
import { NotificationLog } from "./notification-log";
import { EvacuationController } from "./game-elements/evacuation-controller";
import type { EvacuationLogItem, IGameConfig, ISavedGame, MeasureLogItem } from "./models";
import { NotificationType } from "$lib/components/map-core/notifications/notification-type";
import FinalReport from "../components/modal/FinalReport.svelte";
import LevelDescription from "../components/modal/LevelDescription.svelte";
import Cutscene from "../components/Cutscene.svelte";



export class Game extends Dispatcher {

	public static breachStartOffsetInHours: number = 4;

	private uuid: string;
	public name: Writable<string> = writable("");

	public map: Map;
	public marvin?: MarvinApp;
	public gameConfig: IGameConfig;
	public breach: Breach;
	private showBreachLocation: Cesium.ConstantProperty = new Cesium.ConstantProperty(false);

	public notificationLog: NotificationLog;
	public forwarding: Writable<boolean> = writable(false);
	public startTime: number;
	public elapsedTime: Writable<number> = writable(-999); // Initialize to -999 to indicate not preparation phase
	public elapsedTimeSinceBreach: Readable<number> = derived(this.elapsedTime, ($t) => {
		const elapsed = $t - Game.breachStartOffsetInHours;
		this.showBreachLocation.setValue(elapsed >= 0);
		return elapsed;
	});
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
		super();
		this.uuid = savedGame?.uuid ?? uuidv4();
		if (savedGame) this.name.set(savedGame.name);
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
		const evacuationLog: Array<EvacuationLogItem> = get(this.evacuationController.evacuations).map((evacuation) => {
			return {
				routeSegmentIds: evacuation.route.map((r) => r.id),
				hexagonId: evacuation.hexagon.hex,
				extractionPointId: evacuation.extractionPoint.id,
				numberOfPersons: evacuation.numberOfPersons,
				numberOfCars: evacuation.numberOfCars,
				time: evacuation.time
			};
		});
		const measureLog: Array<MeasureLogItem> = this.evacuationController.roadNetwork.measures.map((measure) => {
			return {
				id: measure.config.id,
				applied: get(measure.applied),
			};
		});
		const gameData: ISavedGame = {
			uuid: this.uuid,
			name: get(this.name),
			level: this.gameConfig.name,
			elapsedTime: get(this.elapsedTime),
			evacuations: evacuationLog,
			measures: measureLog,
			lastUpdate: Date.now()
		};
		const gameCache = localStorage.getItem("serious-game-flooding");
		const savedGames: Array<ISavedGame> = gameCache ? JSON.parse(gameCache) : [];
		const existingGameIndex = savedGames.findIndex((g) => g.uuid === this.uuid);
		if (existingGameIndex !== -1) {
			savedGames[existingGameIndex] = gameData;
		} else {
			savedGames.push(gameData);
		}
		localStorage.setItem("serious-game-flooding", JSON.stringify(savedGames));
		this.dispatch("game-saved", {});
	}

	public setSavedState(savedGame: ISavedGame): void {
		this.evacuationController.preload(savedGame.evacuations, savedGame.measures);
		this.setStep(savedGame.elapsedTime);
	}
	
	private setStep(time: number): void {
		if (time !== -999 && (time < this.gameConfig.timesteps[0] || time >= this.gameConfig.timesteps[this.gameConfig.timesteps.length - 1])) {
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
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				show: this.showBreachLocation
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

	private showModal(component: ComponentType, args?: any): void {
		this.dispatch("open-modal", {
			component: component,
			args: args
		});
	}

	public start(): void {
		if (!this.started) {
			this.startCutscene().then(() => {
				this.showModal(LevelDescription, { game: this });
				this.started = true;
			});
		}
	}

	public onCloseLevelDescription(): void {
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
	}

	public startCutscene(): Promise<void> {
		const target = document.getElementById("game-container");
		const cutscene = new Cutscene({
			target: target ?? document.body,
			props: {
				game: this
			}
		});
		return new Promise((resolve) => {
			const onEnd = () => {
				cutscene.$destroy();
				this.off("cutscene-ended", onEnd);
				resolve();
			};
			this.on("cutscene-ended", onEnd);
		});
	}

	public finish(): void {
		this.showModal(FinalReport, { game: this }); 
	}

	public get report(): { evacuatedNeeded: number, evacuatedUnneeded: number, victims: number, evacuatedRequired: number, score: number } {
		const evacuated = get(this.evacuationController.evacuations).reduce((sum, e) => sum + e.numberOfPersons, 0);

		const evacuatedUnneeded = get(this.evacuationController.evacuations).reduce((sum, e) => {
			const hexagon = this.evacuationController.hexagonLayer.hexagons.find((h) => h.hex === e.hexagon.hex);
			if (hexagon && (!hexagon.floodedAt || (e.time < hexagon.floodedAt - 1))) {
				return sum + e.numberOfPersons;
			}
			return sum;
		}, 0);

		const evacuatedNeeded = evacuated - evacuatedUnneeded;

		const victims = this.evacuationController.hexagonLayer.hexagons.reduce((sum, h) => sum + get(h.victims), 0);

		const evacuatedRequired = victims + evacuatedNeeded;

		const score = Math.max(0, Math.round(
			6 * (evacuatedRequired - evacuatedUnneeded) / (evacuatedRequired + 20)
		));

		return {
			evacuatedNeeded: evacuatedNeeded,
			evacuatedUnneeded: evacuatedUnneeded,
			victims: victims,
			evacuatedRequired: evacuatedRequired,
			score: score
		};
	}

	public get timeseriesEvacuated(): Array<{ time: number, value: number }> {
		const timeseries: Array<{ time: number, value: number }> = [];
		get(this.evacuationController.evacuations).forEach((evacuation) => {
			const existingEntry = timeseries.find((t) => t.time === evacuation.time);
			if (existingEntry) {
				existingEntry.value += evacuation.numberOfPersons;
			} else {
				timeseries.push({ time: evacuation.time, value: evacuation.numberOfPersons });
			}
		});
		timeseries.sort((a, b) => a.time - b.time);
		return timeseries;
	}

	public get timeseriesVictims(): Array<{ time: number, value: number }> {
		const timeseries: Array<{ time: number, value: number }> = [];
		this.evacuationController.hexagonLayer.hexagons.forEach((hex) => {
			const victims = get(hex.victims);
			if (victims > 0 && hex.floodedAt) {
				const existingEntry = timeseries.find((t) => t.time === hex.floodedAt);
				if (existingEntry) {
					existingEntry.value += victims;
				} else {
					timeseries.push({ time: hex.floodedAt, value: victims });
				}
			}
		});
		timeseries.sort((a, b) => a.time - b.time);
		return timeseries;
	}
}