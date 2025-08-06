import { Cartesian3, Entity, HeadingPitchRoll, Viewer, CallbackProperty } from "cesium"
import { JulianDate, SampledPositionProperty, VelocityOrientationProperty } from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";
import * as Cesium from "cesium"

export type CameraData = [lon: number, lat: number, height: number, heading: number, pitch: number][];
export type ChinookPositions = Array<{startLon: number, startLat: number, startHeight: number, endLon: number, endLat: number, endHeight: number}>;

type CameraDataCartesian = {
    positions: Array<Cartesian3>, 
    rotations: Array<HeadingPitchRoll>
};

type ChinookDataCartesian = {
    startPosition: Cartesian3, 
    endPosition: Cartesian3, 
    entity?: Entity;
};


export class Cutscene {
    private cameraDataCartesian: CameraDataCartesian = {
        positions: [],
        rotations: []
    };

    private chinookDataCartesian: ChinookDataCartesian[] = [];
    private map: Map;
    private chinookAudio: HTMLAudioElement;

    constructor(map: Map, cameraData: CameraData, chinookPositions: ChinookPositions) {
        this.map = map;
        this.convertPositionsToCartesian3(cameraData, chinookPositions);
        this.loadChinookInstances();
        this.chinookAudio = new Audio("/audio/helicopter-sound.mp3");
        this.chinookAudio.loop = true;
    }

    private convertPositionsToCartesian3(cameraData: CameraData, chinookPositions: ChinookPositions): void {
        for (let i = 0; i < cameraData.length; i++) {
            const [lon, lat, height, headingDeg, pitchDeg] = cameraData[i];
            const position = Cartesian3.fromDegrees(lon, lat, height);
            const rotation = new HeadingPitchRoll(headingDeg * Math.PI / 180, pitchDeg * Math.PI / 180, 0);

            this.cameraDataCartesian.positions.push(position);
            this.cameraDataCartesian.rotations.push(rotation);
        }

        for (let i = 0; i < chinookPositions.length; i++) {
            const start = Cartesian3.fromDegrees(chinookPositions[i].startLon, chinookPositions[i].startLat, chinookPositions[i].startHeight);
            const end = Cartesian3.fromDegrees(chinookPositions[i].endLon,chinookPositions[i].endLat,chinookPositions[i].endHeight);

            this.chinookDataCartesian.push({
                startPosition: start,
                endPosition: end
            });
        }
    }
    
    private computeHeadingPitch(start: Cartesian3, end: Cartesian3): { heading: number, pitch: number } {
        const vector = Cartesian3.subtract(end, start, new Cartesian3());
        Cartesian3.normalize(vector, vector);

        // Heading: angle in horizontal plane (around Z)
        const heading = Math.atan2(vector.y, vector.x);

        // Pitch: angle above the horizontal plane
        const horizontalMagnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        const pitch = Math.atan2(vector.z, horizontalMagnitude);

        return { heading, pitch };
    }

    private loadChinookInstances(): void {
        const startTime = JulianDate.now();
        const durationSeconds = 50;

        for (let i = 0; i < this.chinookDataCartesian.length; i++) {
            const chinook = this.chinookDataCartesian[i];

            // Create a SampledPositionProperty
            const position = new SampledPositionProperty();

            // Compute end time
            const endTime = JulianDate.addSeconds(startTime, durationSeconds, new JulianDate());

            // Add positions to the SampledPositionProperty
            position.addSample(startTime, chinook.startPosition);
            position.addSample(endTime, chinook.endPosition);

            const { heading, pitch } = this.computeHeadingPitch(chinook.startPosition, chinook.endPosition);
            const headingCorrected = heading + Cesium.Math.toRadians(85);
            const pitchCorrected = pitch - Cesium.Math.toRadians(-45); 

            const hpr = new Cesium.HeadingPitchRoll(headingCorrected, 0, 0);
            const orientation = Cesium.Transforms.headingPitchRollQuaternion(chinook.startPosition, hpr);

            const entity = this.map.viewer.entities.add({
                name: `Chinook ${i + 1}`,
                position: position,
                orientation: orientation,
                model: {
                    uri: "/models/ChinookMetLoopAnimatie.glb",
                    scale: 1000.0,
                    minimumPixelSize: 64,
                    runAnimations: true
                }
            });

            chinook.entity = entity;
        }

        const clock = this.map.viewer.clock;
        clock.startTime = startTime.clone();
        clock.stopTime = JulianDate.addSeconds(startTime, durationSeconds, new JulianDate());
        clock.currentTime = startTime.clone();
        clock.clockRange = Cesium.ClockRange.CLAMPED; // stop at the end
        clock.multiplier = 1.0; // real-time speed
        clock.shouldAnimate = true;
    }

    public startAnimation(): void {
        console.log("Starting");
        this.map.viewer.clock.shouldAnimate = true;
        this.startAudio();
    }

    public startAudio() {
        this.chinookAudio.play();
    }

    public stopAudio() {
        this.chinookAudio.pause();
        this.chinookAudio.currentTime = 0;
    }
}


