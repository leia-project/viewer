import * as Cesium from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";
import { get, writable, type Writable } from "svelte/store";


type IsochroneProps = {
    index: number, // counting from inside to outside
    isochroneStart: number,
    isochroneEnd: number,
    weight: number // between 0 and 1
};


export type Isochrone = {
    entity: Cesium.Entity,
    props: IsochroneProps
};


export class IsochronesLayer {
    private map: Map;
    private dataSource: Cesium.CustomDataSource;

    public pointEntity: Cesium.Entity | undefined;
    public coordinates: Writable<{ x: number, y: number } | undefined> = writable(undefined);
    public handler: Cesium.ScreenSpaceEventHandler | undefined;
    public apiKey: Writable<string> = writable("");
    public dataLoading: Writable<boolean> = writable(false);
    public isochrones: Writable<Array<Isochrone>> = writable([]);


    constructor(map: Map) {
        this.map = map;
        this.dataSource = new Cesium.CustomDataSource();

        this.map.viewer.dataSources.add(this.dataSource);

        this.isochrones.subscribe(isos => {
            console.log("Isochrones updated:", isos);
            isos.forEach(iso => {
                console.log("Isochrone:", iso.props);
                const weight = iso.props.weight;

                if (weight < 0 || weight > 1) {
                    console.warn("Weight must be between 0 and 1");
                    return;
                };

                if (!iso.entity.polygon) {
                    console.warn(`Isochrone polygon not found`);
                    return;
                };

                // Create color based on weight: red (high weight) to yellow to green (low weight)
                const color = Cesium.Color.fromHsl(
                    ((1 - weight) * 120) / 360, // Hue: 0 degrees (red) at weight=1, 120 degrees (green) at weight=0
                    1.0,                         // Saturation
                    0.5,                         // Lightness
                    0.7                           // Alpha
                );

                iso.entity.polygon.material = new Cesium.ColorMaterialProperty(color);
            });

            this.map.refresh();
        });
    };


    public show(): void {
        this.dataSource.show = true;
        this.map.refresh();
    };


    public hide(): void {
        this.dataSource.show = false;
        this.map.refresh();
    };

    
    public removePointEntity(): void {
        if (this.pointEntity) {
            this.dataSource.entities.remove(this.pointEntity);
            this.map.refresh();
        };
    };


    public destroyHandler(): void {
        if (this.handler && !this.handler.isDestroyed()) {
            this.handler.destroy();
            this.handler = undefined; // As defined in the documentation
        };
    };


    public addIsochrones(): void {
        const isos = get(this.isochrones);
        if (isos.length > 0) {
            isos.forEach(iso => {
                this.dataSource.entities.add(iso.entity);
            });
            this.map.refresh();
        };
    };


    public removeIsochrones(): void {
        const isos = get(this.isochrones);
        if (isos.length > 0) {
            isos.forEach(iso => {
                this.dataSource.entities.remove(iso.entity);
            });
            this.map.refresh();
        };
    };


    public addPointEntity(): void {
        if (this.pointEntity) {
            this.dataSource.entities.add(this.pointEntity);
            this.map.refresh();
        }
    };


    public updateIsochroneWeight(index: number, weight: number): void {
        if (weight < 0 || weight > 1) {
            console.warn("Weight must be between 0 and 1");
            return;
        }

        this.isochrones.update(isos => {
            const updatedIsos = isos.map(iso => {
                if (iso.props.index === index) {
                    return {
                        ...iso,
                        props: {
                            ...iso.props,
                            weight: weight
                        }
                    };
                }
                return iso;
            });
            return updatedIsos;
        });
    };


    public updateIsochroneColors(): void {
        const isos = get(this.isochrones);
        isos.forEach(iso => {
            const properties = iso.props;
            const weight = properties.weight;

            if (weight < 0 || weight > 1) {
                console.warn("Weight must be between 0 and 1");
                return;
            }

            if (!iso.entity.polygon) {
                console.warn(`Isochrone polygon not found`);
                return;
            }

            // Create color based on weight: red (high weight) to yellow to green (low weight)
            const color = Cesium.Color.fromHsl(
                ((1 - weight) * 120) / 360, // Hue: 0 degrees (red) at weight=1, 120 degrees (green) at weight=0
                1.0,                         // Saturation
                0.5,                         // Lightness
                0.7                          // Alpha
            );

            iso.entity.polygon.material = new Cesium.ColorMaterialProperty(color);
        });

        this.map.refresh();
    };


    public drawPoint(): void {
        this.handler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.canvas);

        // Handle left click to create isochrone center point
        this.handler.setInputAction((event: any) => {
            const earthPosition = this.map.viewer.scene.pickPosition(event.position);
            if (!earthPosition) return;

            this.removePointEntity();

            this.coordinates.set(this.longLatFromCartesian(earthPosition));
            
            this.pointEntity = this.dataSource.entities.add({
                position: earthPosition,
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.RED,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN
                },
            });
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };

    private longLatFromCartesian(cartesian: Cesium.Cartesian3): { x: number, y: number } {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const x = Cesium.Math.toDegrees(cartographic.longitude);
        const y = Cesium.Math.toDegrees(cartographic.latitude);
        return { x, y };
    }


    // Uses GeodanMaps Isochrone API to calculate isochrones for car travel:
    // https://services.geodan.nl/docs/api/?url=/docs/api/schema/routing_service-v2.yaml#/Travel%20times
    private async calculateCarIosochrones(
        x: number,
        y: number,
        steps: Array<number>,
        overlap: boolean = true,            // optional
        calculationMode: string = "time",   // optional
        precision: number = 0.95,           // optional
        apiKey: string                      // optional
    ): Promise<any> {
        const baseUrl = "https://services.geodan.nl/routing/v2/isochrone/auto";
        const direction = "from";
        const output = "polygon";
        const stepParams = steps.map(step => `steps=${step}`).join("&");

        const apiUrl = `${baseUrl}?x=${x}&y=${y}&direction=${direction}&${stepParams}&overlap=${overlap}&output=${output}&calculationMode=${calculationMode}&precision=${precision}${apiKey ? `&apikey=${apiKey}` : ""}`;
        this.destroyHandler(); // Stop drawing

        try {
            this.dataLoading.set(true);
            const response = await fetch(apiUrl, {
                method: "GET"
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json();
            
            // Process and display the isochrone polygons on the map
            if (data?.features) {
                this.removeIsochrones();

                const startWeights = [0.5, 0.3, 0.2]; // Example weights for 3 isochrones
                const newIsochrones: Array<Isochrone> = [];
                let hole: Cesium.PolygonHierarchy[] | undefined = undefined;
                let hierarchy: Cesium.PolygonHierarchy;

                data.features.forEach((feature: any, index: number) => {
                    console.log("Isochrone Feature:", feature);
                    const props = feature.properties;
                    const isochroneNumber = props.isochrone;
                    const isochroneStart = props.isochroneStart;
                    const isochroneEnd = props.isochroneEnd;
                    const coordinates = feature.geometry.coordinates[0].map((coord: any) => {
                        return Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
                    });

                    if (hole) {
                        hierarchy = new Cesium.PolygonHierarchy(coordinates, hole);
                    }
                    else {
                        hierarchy = new Cesium.PolygonHierarchy(coordinates);
                    }

                    const isochroneEntity = this.dataSource.entities.add({
                        polygon: {
                            hierarchy: hierarchy,
                            material: Cesium.Color.WHITE.withAlpha(0.7),
                            heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN
                        },
                        properties: {
                            index: isochroneNumber,
                            isochroneStart: isochroneStart,
                            isochroneEnd: isochroneEnd,
                        }
                    });

                    // Previous polygon becomes hole for next
                    hole = [new Cesium.PolygonHierarchy(coordinates)];


                    const isochrone: Isochrone = {
                        entity: isochroneEntity,
                        props: {
                            index: isochroneNumber,
                            isochroneStart: isochroneStart,
                            isochroneEnd: isochroneEnd,
                            weight: startWeights[index]
                        }
                    };
                    newIsochrones.push(isochrone);
                });
                this.isochrones.set(newIsochrones);
                this.map.refresh();
                console.log("Isochrones added to map:", get(this.isochrones));
            }
            else {
                console.warn("No features found in isochrone data");
            }
        } catch (error) {
            console.error("Failed to send request:", error);
        }
        finally {
            this.dataLoading.set(false);
        }
    };


    public entityToIsochrones(): void {
        if (!get(this.apiKey)) {
            console.warn("No API key defined for isochrone calculation");
            return;
        }

        // this.XYFromEntity(this.pointEntity);
        const coords = get(this.coordinates);
        if (!coords) {
            console.warn("Failed to get coordinates from point entity");
            return;
        }
        const { x, y } = coords;


        // Calculates isochrones and displays them on the map
        this.calculateCarIosochrones(
            x, 
            y, 
            [20, 20, 20],  // 20-minute isochrones
            true, 
            "time", 
            0.99, 
            get(this.apiKey)
        );
    };
};
