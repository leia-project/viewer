import { MonitoringWellData } from "./monitoring-well-data";
import * as Cesium from "cesium";

export class MonitoringWells extends MonitoringWellData {
    private radius: number;
    private wells: any;

    constructor(dataSource: Cesium.CustomDataSource, data: any, config: any) {
        super(dataSource, data, config);
        this.radius = 0.3;
        this.wells = [];
    }

    public makeWell(id: string, wellInfo: Array<number>, head: number) {
        if (this.wells.includes(id)) {
            return;
        }
        const x = wellInfo[1]
        const y = wellInfo[2]
        const top = wellInfo[5];
        const bottom = wellInfo[4];
        const chartData = this.prepareChartData(id);

        const lengthWet = head - bottom;
        const zWet = lengthWet / 2 + bottom;
        const cylinderWet = this.dataSource.entities.add({
            name: id,
            position: Cesium.Cartesian3.fromDegrees(x, y, zWet),
            cylinder: {
                length: lengthWet,
                topRadius: this.radius,
                bottomRadius: this.radius,
                material: Cesium.Color.BLUE.withAlpha(0.9),
                outline: true,
                outlineColor: Cesium.Color.BLACK,
            },
            properties: {
                'Bovenkant buis': top,
                'Onderkant filter': bottom,
                'Meest recente stijghoogte': head,
                'Bedrijf': this.config[wellInfo[0]]['BEDRIJF'],
                'Meetnet naam GTA': this.config[wellInfo[0]]['MEETNET_NAAM_GTA'],
                'Plot': chartData
            }
        });

        const lengthDry = top - head;
        const zDry = lengthDry / 2 + head;
        const cylinderDry = this.dataSource.entities.add({
            name: id,
            position: Cesium.Cartesian3.fromDegrees(x, y, zDry),
            cylinder: {
                length: lengthDry,
                topRadius: this.radius,
                bottomRadius: this.radius,
                material: Cesium.Color.BLUE.withAlpha(0.2),
                outline: true,
                outlineColor: Cesium.Color.BLUE.withAlpha(0.5),
            },
            properties: {
                'Bovenkant buis': top,
                'Onderkant filter': bottom,
                'Meest recente stijghoogte': head,
                'Bedrijf': this.config[wellInfo[0]]['BEDRIJF'],
                'Meetnet naam GTA': this.config[wellInfo[0]]['MEETNET_NAAM_GTA'],
                'Plot': chartData
            }
        });

        this.wells.push(cylinderWet, cylinderDry);
    }

    public generateMonitoringWells(id_array: Array<string> | undefined = undefined) {
        const wells = id_array ?? this.getWellIDs();
        for (let i = 0; i < wells.length; i++) {
            const well = wells[i];
            let wellInfo = this.getMetaData(well);
            let head = this.getHydraulicHead(well);
            if (head && wellInfo) {
                this.makeWell(well, wellInfo, head);
            }
        }
    }

    public addWells(id_array: Array<string>): void {
        let toBeAdded = [];

        for (let i = 0; i < id_array.length; i++) {
            let exists = 0;
            for (let x = 0; x < this.wells.length; x++) {
                if (this.wells[x].name.includes(id_array[i])) {
                    exists = 1;
                }
            }
            if (exists == 0) {
                toBeAdded.push(id_array[i]);
            }
        }
        this.generateMonitoringWells(toBeAdded);
    }

    public removeWells(id_array: Array<number>): void {
        for (let i = 0; i < id_array.length; i++) {
            let y = 0;
            for (let x = 0; x < this.wells.length; x++) {
                if (this.wells[x].name.includes(id_array[i])) {
                    this.dataSource.entities.remove(this.wells[x]);
                    this.wells.splice(x, 1);
                    x--;
                }
            }
        }
    }
}