import { MonitoringWellData } from "./monitoring-well-data";
import * as Cesium from "cesium";

export class FreaticLine extends MonitoringWellData {
    private freaticLineWidth;
    private freaticLine: any;
    private freaticLinePast: any;

    constructor(dataSource: Cesium.CustomDataSource, data: any, config: any){
        super(dataSource, data, config);
        this.freaticLineWidth = 8;
    }

    private sortFreaticLineData(dir: string, idx: number = this.data.length - 1): Array<number> { 
        const wells = this.getWellIDs();
        let freaticArray = [];
        for (const well of wells) { 
            let meta = this.getMetaData(well);
            let head = this.getHydraulicHead(well, idx);
            if (meta && head) {
                freaticArray.push([meta[1], meta[2], head]);
            }
        }

        let i = dir == 'ns' ? 1 : 0;
        let sortedArray = freaticArray.sort(function(a, b){ return a[i] - b[i]});

        let result = [];
        if (sortedArray.length < 2) {
            return [];
        }

        for (let x = 0; x < sortedArray.length; x++) {
            result.push(sortedArray[x][0]);
            result.push(sortedArray[x][1]);
            result.push(sortedArray[x][2]);
        }
        return result;
    }

    public generateFreaticLine(dir: string = 'ew'){
        let coordinateArray = this.sortFreaticLineData(dir);
        const freaticLineInst = this.dataSource.entities.add({
            name: "Freatic Line",
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(coordinateArray),
                width: this.freaticLineWidth,
                material: new Cesium.PolylineOutlineMaterialProperty({
                    color: Cesium.Color.BLUE.withAlpha(0.9),
                    outlineWidth: 2,
                    outlineColor: Cesium.Color.BLACK,
                  })
            },
        });

        this.freaticLine = freaticLineInst;
    }

    public generateFreaticLinePast(dir = 'ew', idx: number){
        if (typeof idx == undefined) return;
        let coordinateArray = this.sortFreaticLineData(dir, idx);
        let date = this.data[idx][''];
        if (this.freaticLinePast == undefined) {
            const freaticLineInst = this.dataSource.entities.add({
                name: "Freatic Line: " + date,
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights(coordinateArray),
                    width: this.freaticLineWidth,
                    material: new Cesium.PolylineOutlineMaterialProperty({
                        color: Cesium.Color.RED.withAlpha(0.7),
                        outlineWidth: 2,
                        outlineColor: Cesium.Color.BLACK,
                    })
                },
            });
            this.freaticLinePast = freaticLineInst;
        } else {
            this.freaticLinePast.polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights(coordinateArray);
        }   
    }
}
