import { rdToDegrees } from "../../utils/rd-utils";

import type { CustomDataSource } from "cesium";

export class MonitoringWellData {
    public data: any;
    public config: any;
    public dataSource: CustomDataSource;

    constructor(dataSource: CustomDataSource, data: any, config: any) {
        this.dataSource = dataSource;
        this.data = data;
        this.config = config;
    }

    public getWellIDs(): Array<string> {
        let id_array = [];
        for (let i = 1; i < Object.keys(this.data[0]).length; i ++) {
            if (!['quality','comments','skip'].some(x => Object.keys(this.data[0])[i].includes(x))) {
                id_array.push(Object.keys(this.data[0])[i]);
            }
        }
        return id_array;
    }

    public getMetaData(wellID: string): Array<number> | undefined {
        for (let i = 0; i < this.config.length; i++) {
            if (this.config[i]['ID'].trim() === wellID) {
                let coordinates = rdToDegrees(this.config[i]['X'], this.config[i]['Y'])
                let metadata = [i, coordinates[0], coordinates[1], parseFloat(this.config[i]['BOVENKANT_FILTER']), parseFloat(this.config[i]['ONDERKANT_FILTER']), parseFloat(this.config[i]['BOVENKANT_BUIS']), parseFloat(this.config[i]['MAAIVELD'])];
                return metadata;
            }
        }
    }

    public getHydraulicHead(wellID: string, rowIndex = this.data.length - 1): number | undefined {
        // If rowIndex is not specified, the most recent data/date is taken
        try {
            return parseFloat(this.data[rowIndex][wellID].replace(',', '.'));
        } catch(err) {
            console.log('No value found for the hydraulic head. No data or empty line in the file.')
        }
    }

    public prepareChartData(columnName: string): Array<{}> {
        let result = [];
        for (let row=1; row<this.data.length-1; row++) {
            result.push({
                x: this.data[row][""],
                [columnName]: this.data[row][columnName].replace(",", ".")
            });
        }
        return result;
    }
}