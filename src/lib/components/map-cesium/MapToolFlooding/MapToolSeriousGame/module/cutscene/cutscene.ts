import { writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "../../external-dependencies";
import { FloodLayerController, type Breach, type FloodToolSettings } from "../../../layer-controller";
import { FlightPath,  type FlightPathPoint } from "./flight-path";


export class CutScene {

	private map: Map;
	private flightPath: FlightPath;
	private chinooks: Array<ChinookIntersect> = [];
	private chinookAudio: HTMLAudioElement;
	private backgroundAudio: HTMLAudioElement;

	private floodLayerController: FloodLayerController;
	private breach: Breach;
	private scenario: string;

	private bgSwitched: boolean = false;

	private speedModifier: number = 1;

	constructor(map: Map, startTime: string, flightPathData: Array<FlightPathPoint>, breach: Breach, scenario: string, floodToolSettings: FloodToolSettings) {
		this.map = map;
		this.flightPath = new FlightPath(flightPathData, Cesium.JulianDate.fromIso8601(startTime));
		this.floodLayerController = new FloodLayerController(map, floodToolSettings, writable(), writable());
		this.breach = breach;
		this.scenario = scenario;
		this.chinookAudio = new Audio("/audio/helicopter-sound-2.mp3");
		this.chinookAudio.loop = true;
		this.chinookAudio.volume = 0;
		this.chinookAudio.playbackRate = this.speedModifier;
		this.loadChinooks();

		this.backgroundAudio = new Audio("/audio/background-cutscene-music.mp3");
		this.backgroundAudio.loop = true;
		this.backgroundAudio.volume = 0.2;
		this.backgroundAudio.playbackRate = this.speedModifier;
	}

	public start(speed: number = 1): void {
		this.speedModifier = speed;
		this.map.viewer.clock.startTime = this.flightPath.startTime.clone();
		this.map.viewer.clock.stopTime = this.flightPath.stopTime.clone();
		this.map.viewer.clock.currentTime = this.flightPath.startTime.clone();
		//this.map.viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
		this.map.viewer.clock.shouldAnimate = true;
		this.map.viewer.scene.postUpdate.addEventListener(this.onPostUpdate);

		this.chinookAudio.play();
		this.map.viewer.camera.changed.addEventListener(this.onCameraUpdate);

		this.floodLayerController.floodLayer.loadScenario(this.breach, this.scenario).then(() => {
			this.floodLayerController.floodLayer.addToMap();
			this.floodLayerController.floodLayer.show();
			this.floodLayerController.addTimeSubscriber();
			this.map.viewer.clock.onTick.addEventListener(this.onTick);
		});

		this.backgroundAudio.play();
		const mapControls = document.getElementsByClassName("bottom-right");
		if (mapControls[0]) {
			(mapControls[0] as HTMLElement).style.display = "none";
		}
		this.flightPath.applyToCamera(this.map.viewer);
	}

	public stop(): void {
		this.map.viewer.clock.shouldAnimate = false;
		this.map.viewer.clock.multiplier = 1;
		this.chinookAudio.pause();
		this.backgroundAudio.pause();
		//this.floodLayerController.floodLayer.removeFromMap();
		const mapControls = document.getElementsByClassName("bottom-right");
		if (mapControls[0]) {
			(mapControls[0] as HTMLElement).style.removeProperty('display');
		}
		this.map.viewer.clock.onTick.removeEventListener(this.onTick);
		this.map.viewer.scene.postUpdate.removeEventListener(this.onPostUpdate);
		this.map.viewer.camera.changed.removeEventListener(this.onCameraUpdate);
	}

	private onPostUpdate = (scene: Cesium.Scene, time: Cesium.JulianDate) => {
		if (!Cesium.JulianDate.greaterThanOrEquals(time, this.flightPath.startTime) ||
			!Cesium.JulianDate.lessThanOrEquals(time, this.flightPath.stopTime)) {
			return;
		}

		if (time > Cesium.JulianDate.addSeconds(this.flightPath.startTime, this.flightPath.times[6], new Cesium.JulianDate()) && !this.bgSwitched) {
			const brt = this.map.getLayerById("1");
			if (brt) {
				brt.visible.set(true);
			}
			this.bgSwitched = true;
		}
		if (time > Cesium.JulianDate.addSeconds(this.flightPath.startTime, this.flightPath.times[7], new Cesium.JulianDate())) {
			this.map.viewer.clock.multiplier = 1500 * this.speedModifier;
		} else {
			this.map.viewer.clock.multiplier = this.speedModifier;
		}
		
		const position = this.flightPath.positionProperty.getValue(time);
		const heading = this.flightPath.headingProperty.getValue(time);
		const pitch = this.flightPath.pitchProperty.getValue(time);
		
		if (position && heading) {
			const hpr = new Cesium.HeadingPitchRoll(heading, pitch, 0);
			this.map.viewer.scene.camera.setView({
				destination: position,
				orientation: hpr
			});
		}

		if (Cesium.JulianDate.greaterThanOrEquals(time, this.flightPath.stopTime)) {
			this.stop();
		}
	}

	private onCameraUpdate = () => {
		const chinook = this.chinooks[0];
		const positionChinook = chinook.currentPosition;
		const positionCamera = this.flightPath.getTimedPosition(this.map.viewer.clock.currentTime);
		if (!positionChinook || !positionCamera) {
			return;
		}
		const distance = Cesium.Cartesian3.distance(positionChinook, positionCamera);
		const volume = chinook.volumeByDistance(distance);
		this.chinookAudio.volume = volume;
	}

	private onTick = () => {
		this.map.viewer.clock.onTick.addEventListener(() => {
			const currentTime = this.map.viewer.clock.currentTime;
			let elapsedSeconds = Cesium.JulianDate.secondsDifference(currentTime, this.flightPath.startTime);
			if (elapsedSeconds > 26) {
				elapsedSeconds = 26 + (elapsedSeconds - 26) / (1500 * this.speedModifier);
			}
			this.floodLayerController.time.set(elapsedSeconds - 9);
		});
	}

	
	public loadChinooks(): void {
		const secondsUntilIntersect = this.flightPath.times[6] - 2;
		const intersectTime = Cesium.JulianDate.addSeconds(this.flightPath.startTime, secondsUntilIntersect, new Cesium.JulianDate());
		const chinookData: ChinookIntersectData = {
			heading: 65,
			speed: 380,
			intersectionPoint: Cesium.Cartesian3.fromDegrees(3.48223, 51.49856, 88),
			intersectionTime: intersectTime,
			startTime: this.flightPath.startTime,
			stopTime: this.flightPath.stopTime
		}
		const chinook = new ChinookIntersect(
			this.map,
			chinookData
		);
		
		const chinookData2 = {...chinookData};
		chinookData2.speed = 360;
		const chinook2 = new ChinookIntersect(
			this.map,
			chinookData2,
			{ x: 20, y: 30, z: 8 }
		);
		
		const chinookData3 = {...chinookData};
		chinookData3.speed = 430;
		const chinook3 = new ChinookIntersect(
			this.map,
			chinookData3,
			{ x: -30, y: -20, z: 5 }
		);
		this.chinooks.push(chinook, chinook2, chinook3);
	}
}








import type { GameController } from "../game-controller";
import { ChinookIntersect, type ChinookIntersectData } from "./chinook";

export function startCutscene(map: Map, gameController: GameController, speed: number = 1): CutScene {
	const data: Array<FlightPathPoint> = [
		{
			lon: 3.41884,
			lat: 51.53823,
			height: 600,
			speed: 500,
			angle: 40
		},
		{
			lon: 3.42941,
			lat: 51.53084,
			height: 250,
			speed: 400,
			angle: 20
		},
		{
			lon: 3.43852,
			lat: 51.52433,
			height: 82,
			speed: 300
		},
		{
			lon: 3.44941,
			lat: 51.51550,
			height: 81,
			speed: 300
		},
		{
			lon: 3.45811,
			lat: 51.51020,
			height: 80,
			speed: 240
		},
		{
			lon: 3.47779,
			lat: 51.50096,
			height: 78,
			speed: 150
		},
		{
			lon: 3.48169,
			lat: 51.49641,
			height: 90,
			speed: 2000,
			lookAt: {
				lon: 3.494062,
				lat: 51.50086,
				height: 50
			}
		},
		{
			lon: 3.45717,
			lat: 51.43064,
			height: 3200,
			speed: 1.5,
			lookAt: {
				lon: 3.52062,
				lat: 51.50286,
				height: 50
			}
		},
		{
			lon: 3.24538,
			lat: 51.41853,
			height: 9821,
			speed: 0, // not used for last point
			lookAt: {
				lon: 3.53902,
				lat: 51.50451,
				height: 50
			}
		}
	];
	const floodTool = map.toolSettings.find((tool: { id: string, settings: any}) => tool.id === "flooding");
	const breach = gameController.breaches.find((b) => b.properties.name === "NzWal-DP330") as Breach;
	const cutscene = new CutScene(map, "2023-10-01T08:50:00+02:00", data, breach, "10000", floodTool.settings);
	cutscene.start(speed);
	return cutscene;
}
