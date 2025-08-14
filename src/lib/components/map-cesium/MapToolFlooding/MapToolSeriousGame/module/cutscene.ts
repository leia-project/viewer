import { Cartesian3, Entity, HeadingPitchRoll } from "cesium"
import { JulianDate, SampledPositionProperty } from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";
import * as Cesium from "cesium"

export type CameraData = {lon: number, lat: number, height: number, heading: number, pitch: number}[];
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

    private cameraPositionProperty = new SampledPositionProperty();
    private cameraRotationProperty = new Cesium.SampledProperty(Cesium.Quaternion);


    constructor(map: Map, cameraData: CameraData, chinookPositions: ChinookPositions) {
        this.map = map;
        this.convertPositionsToCartesian3(cameraData, chinookPositions);
        this.loadChinookInstances();
        this.chinookAudio = new Audio("/audio/helicopter-sound.mp3");
        this.chinookAudio.loop = true;
    }

    private convertPositionsToCartesian3(cameraData: CameraData, chinookPositions: ChinookPositions): void {
        const startTime = JulianDate.now();
        let currentTime = JulianDate.clone(startTime);
        const cameraSpeed = 240; 
        let previousPosition: Cartesian3 = Cartesian3.ONE;

        for (let i = 0; i < cameraData.length; i++) {
            const {lon, lat, height, heading, pitch} = cameraData[i];
            const position = Cartesian3.fromDegrees(lon, lat, height);
            const rotation = new HeadingPitchRoll(
                Cesium.Math.toRadians(heading - 90),
                Cesium.Math.toRadians(pitch),
                0
            );
            
            let intervalInSeconds = 0;
            if (i != 0) {
                const distanceBetweenPoints = Cartesian3.distance(previousPosition, position);
                intervalInSeconds = distanceBetweenPoints / cameraSpeed;
                currentTime = JulianDate.addSeconds(currentTime, intervalInSeconds, new JulianDate());
            }
            
            

            this.cameraDataCartesian.positions.push(position);
            this.cameraDataCartesian.rotations.push(rotation);

            this.cameraPositionProperty.addSample(currentTime, position);

            const quaternion = Cesium.Transforms.headingPitchRollQuaternion(position, rotation);
            this.cameraRotationProperty.addSample(currentTime, quaternion);
            previousPosition = position;
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
    
   private computeHeadingPitch(start: Cartesian3, end: Cartesian3): number {
        // Get direction vector from start to end
        const direction = Cartesian3.subtract(end, start, new Cartesian3());
        Cartesian3.normalize(direction, direction);

        // Get the ENU frame (East-North-Up) at the start point
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(start);

        // Inverse transform to convert world direction to local ENU frame
        const inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
        const localDirection = Cesium.Matrix4.multiplyByPointAsVector(inverseTransform, direction, new Cartesian3());

        // Compute heading as angle from local North (Y-axis) to direction projected in X-Y plane
        const heading = Math.atan2(localDirection.x, localDirection.y); // X = East, Y = North in ENU

        return heading; // In radians
    }

    private loadChinookInstances(): void {
        const startTime = JulianDate.now();
        const durationSeconds = 81;

        for (let i = 0; i < this.chinookDataCartesian.length; i++) {
            const chinook = this.chinookDataCartesian[i];

            // Create a SampledPositionProperty
            const position = new SampledPositionProperty();

            // Compute end time
            const endTime = JulianDate.addSeconds(startTime, durationSeconds, new JulianDate());

            // Add positions to the SampledPositionProperty
            position.addSample(startTime, chinook.startPosition);
            position.addSample(endTime, chinook.endPosition);

            const heading = this.computeHeadingPitch(chinook.startPosition, chinook.endPosition); 

            const hpr = new Cesium.HeadingPitchRoll(heading + 0.5 * Math.PI, 0);
            const orientation = Cesium.Transforms.headingPitchRollQuaternion(chinook.startPosition, hpr);

            const entity = this.map.viewer.entities.add({
                name: `Chinook ${i + 1}`,
                position: position,
                orientation: orientation,
                model: {
                    uri: "/models/ChinookMetLoopAnimatie.glb",
                    scale: 100.0,
                    minimumPixelSize: 64,
                    runAnimations: true
                }
            });

            chinook.entity = entity;
        }

        const clock = this.map.viewer.clock;
        clock.startTime = startTime.clone();
        clock.stopTime = JulianDate.addSeconds(startTime, durationSeconds * 10, new JulianDate());
        clock.currentTime = startTime.clone();
        clock.clockRange = Cesium.ClockRange.CLAMPED; // stop at the end
        clock.multiplier = 1.0; // real-time speed
        clock.shouldAnimate = true;
    }

    private animateCamera(): void {
        const viewer = this.map.viewer;

        viewer.scene.postUpdate.addEventListener((scene, time) => {
            const position = this.cameraPositionProperty.getValue(time);
            const quaternion = this.cameraRotationProperty.getValue(time);

            if (position && quaternion) {
                const rotationMatrix = Cesium.Matrix3.fromQuaternion(quaternion);
                const direction = Cesium.Matrix3.getColumn(rotationMatrix, 0, new Cesium.Cartesian3()); // X-axis = forward
                const up = Cesium.Matrix3.getColumn(rotationMatrix, 2, new Cesium.Cartesian3()); // Z-axis = up

                viewer.scene.camera.setView({
                    destination: position,
                    orientation: {
                        direction,
                        up
                    }
                });
            }
        });
    }

    public startAnimation(): void {
        this.startAudio();
        this.animateCamera();
    }

    public startAudio() {
        this.chinookAudio.play();
    }

    public stopAudio() {
        this.chinookAudio.pause();
        this.chinookAudio.currentTime = 0;
    }
}


