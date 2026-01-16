import * as Cesium from "cesium";


export type Isochrone = {
    entity: Cesium.Entity,
    props: {
        isochrone: number,
        isochroneStart: number,
        isochroneEnd: number
    }
}

export let isochrones: Array<Isochrone> = [];
