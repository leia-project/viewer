import { writable, get } from "svelte/store";
import * as Cesium from "cesium";

import type { Map } from "./map";
import type { CameraLocation } from "$lib/components/map-core/camera-location";

export class MapMeasurement {
    public id: number;
    public title: string;
    public map: Map;
    public totalLength = writable<number>(0);
    public visible = writable<boolean>(true);
    public cameraLocation = writable<CameraLocation>(undefined);

    public points = writable<Array<Cesium.Cartesian3>>(new Array<Cesium.Cartesian3>);
    public pointEntities = new Array<Cesium.Entity>();
    private lineEntities = new Array<Cesium.Entity>();
    private helpLineEntities = new Array<Cesium.Entity>();

    public pointFill = Cesium.Color.RED;
    public pointOutline = Cesium.Color.BLACK;
    public helpLineColor = Cesium.Color.YELLOW;
    public lineColor = Cesium.Color.RED;

    constructor(id: number, map: Map) {
        this.id = id;
        this.map = map;
        this.title = "";

        this.points.subscribe((points) => {
            this.calculateLength(points);
        });

        this.visible.subscribe((v) => {
            this.setVisibility(v);
        });
    }

    private calculateLength(points: Array<Cesium.Cartesian3>): void {
        let length = 0.0;

        for (let i = 0; i < points.length - 1; i++) {
            length += this.distanceVector(points[i], points[i + 1]);
        }

        this.totalLength.set(Number.parseFloat(length.toFixed(2)));
    }

    public addPoint(location: Cesium.Cartesian3): void {
        const pnts = get(this.points);

        pnts.push(location);
        this.points.set(pnts);
        this.addEntityOnPointAdd(location, pnts.length -1);
    }

    public removePoint(pointIndex: number): void {
        const points = get(this.points);
        points.splice(pointIndex, 1);
        this.points.set(points);

        this.clearEntities();
        this.reconstructEntities();
    }

    public toStorageObject(): any {
        const obj = {
            title: this.title,
            visible: get(this.visible),
            cameraLocation: get(this.cameraLocation),
            points: get(this.points)
        }

        return obj;
    }

    public fromStorage(obj: any): void {
        this.title = obj.title;
        this.cameraLocation.set(obj.cameraLocation);
        this.points.set(obj.points);
        this.reconstructEntities();
        this.hideEdit();
        this.visible.set(obj.visible);
        
        this.map.refresh();
    }

    private reconstructEntities(): void {
        const points = get(this.points);
        for(let i = 0; i < points.length; i++) {
            this.addEntityOnPointAdd(points[i], i);
        }
    }

    private addEntityOnPointAdd(location: Cesium.Cartesian3, index: number): void {
        const pnts = get(this.points);
        this.addPointEntity(location, index);

        const from = pnts[index - 1];
        const to = pnts[index];

        if (from && to) {
            this.addLineEntity(from, to);
        }

        this.addHelpLine(location);
    }

    private clearEntities(): void {
        for(let i = 0; i < this.pointEntities.length; i++) {
            this.map.viewer.entities.remove(this.pointEntities[i]);
        }

        for(let i = 0; i < this.lineEntities.length; i++) {
            this.map.viewer.entities.remove(this.lineEntities[i]);
        }

        for(let i = 0; i < this.helpLineEntities.length; i++) {
            this.map.viewer.entities.remove(this.helpLineEntities[i]);
        }
    }

    public remove() {
        this.clearEntities();
    }

    public show() {
        this.visible.set(true);
    }

    public hide() {
        this.visible.set(false);
    }

    public showEdit() {
        const pnts = get(this.points);

        for(let i = 0; i < this.pointEntities.length; i++) {
            // @ts-ignore
            this.pointEntities[i].label.show = true;
        }

        for(let i = 0; i < pnts.length; i++) {
            this.addHelpLine(pnts[i]);
        }
    }

    public hideEdit() {
        for(let i = 0; i < this.pointEntities.length; i++) {
            // @ts-ignore
            this.pointEntities[i].label.show = false;
        }

        for(let i = 0; i < this.helpLineEntities.length; i++) {
            this.map.viewer.entities.remove(this.helpLineEntities[i]);
        }
    }

    public lookAt(pointIndex: number) {
        const location = get(this.points)[pointIndex];
        this.map.lookAt(location);
    }

    public zoomToLocation() {
        this.show();
        const location = get(this.cameraLocation);
        if(location) {
            this.map.flyTo(location);
        }
    }

    private setVisibility(show: boolean): void {
        for(let i = 0; i < this.pointEntities.length; i++) {
            this.pointEntities[i].show = show;
        }

        for(let i = 0; i < this.lineEntities.length; i++) {
            this.lineEntities[i].show = show;
        }

        this.visible.set(show);
        this.map.refresh();
    }

    public getDistanceToPrevious(pointIndex: number): number {
        const pnts = get(this.points);
        const from = pnts[pointIndex - 1];
        const to = pnts[pointIndex];

        return from && to ? this.distanceVector(from, to) : 0;
    }

    public addPointEntity(location: Cesium.Cartesian3, index: number): void {
        const entity = this.map.viewer.entities.add({
			position: location,
			point: {
				show: true,
				color: this.pointFill,
				pixelSize: 10,
				outlineColor: this.pointOutline,
				outlineWidth: 1
			},     
            label: {
                text: `${index}`,
                font: '12px Helvetica',
                fillColor: Cesium.Color.WHITE,
                backgroundColor: Cesium.Color.BLACK,
                showBackground: true,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                eyeOffset: new Cesium.Cartesian3( 0, 0, -10),
                pixelOffset: new Cesium.Cartesian2(0, -10),
                show: true
            }       
		});

        this.pointEntities.push(entity);
    }

    private addLineEntity(from: Cesium.Cartesian3, to: Cesium.Cartesian3): void {
        const distance = this.distanceVector(from, to);
        const center = this.centerVector(from, to);
        const entity = this.map.viewer.entities.add({
            position: center,
            polyline: {
                positions: [from, to],
                width: 3,
                material: this.lineColor
            },
            label: {
                text: `${distance.toFixed(2)} M`,
                font: '16px Helvetica',
                fillColor: Cesium.Color.WHITE,
                backgroundColor: Cesium.Color.BLACK,
                showBackground: true,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                eyeOffset: new Cesium.Cartesian3( 0, 0, -10),
                show: true
            }
        });

        this.lineEntities.push(entity);
    }

    private addHelpLine(mid: Cesium.Cartesian3): void {
        const pos = Cesium.Cartographic.fromCartesian(mid);

        const cartoFrom = Cesium.Cartographic.fromRadians(pos.longitude, pos.latitude, pos.height - 100);
        const cartoTo = Cesium.Cartographic.fromRadians(pos.longitude, pos.latitude, pos.height + 100);
        const from = Cesium.Cartographic.toCartesian(cartoFrom);
        const to = Cesium.Cartographic.toCartesian(cartoTo);

        const entity = this.map.viewer.entities.add({
            polyline: {
                positions: [from, to],
                width: 1,
                material: this.helpLineColor
            },
        });

        this.helpLineEntities.push(entity);
    }

    private centerVector(from: Cesium.Cartesian3, to: Cesium.Cartesian3): Cesium.Cartesian3 {
        return new Cesium.Cartesian3((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
    }

    private distanceVector(from: Cesium.Cartesian3, to: Cesium.Cartesian3): number {
        var dx = from.x - to.x;
        var dy = from.y - to.y;
        var dz = from.z - to.z;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}