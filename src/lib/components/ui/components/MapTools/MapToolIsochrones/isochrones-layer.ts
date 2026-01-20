import * as Cesium from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";


type IsochroneProps = {
    isochrone: number,
    isochroneStart: number,
    isochroneEnd: number
};


export type Isochrone = {
    entity: Cesium.Entity,
    props: IsochroneProps
};


export class IsochronesLayer {
    private map: Map;
    private dataSource: Cesium.CustomDataSource;

    public pointEntity: Cesium.Entity | undefined;
    public handler: Cesium.ScreenSpaceEventHandler | undefined;
    public apiKey: string | undefined;
    public dataLoading: boolean = false;
    public isochrones: Array<Isochrone> = [];


    constructor(map: Map) {
        this.map = map;
        this.dataSource = new Cesium.CustomDataSource();

        this.map.viewer.dataSources.add(this.dataSource);
    };


    public show(): void {
        this.dataSource.show = true;
        this.map.refresh();
    };


    public hide(): void {
        this.dataSource.show = false;
        this.map.refresh();
    };


    public addProperties(): void {
        // Add any specific properties for isochrones layer here
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
        if (this.isochrones.length > 0) {
            this.isochrones.forEach(iso => {
                this.dataSource.entities.add(iso.entity);
            });
            this.map.refresh();
        };
    };


    public removeIsochrones(): void {
        if (this.isochrones.length > 0) {
            this.isochrones.forEach(iso => {
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


    public drawPoint(): void {
        this.handler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.canvas);

        // Handle left click to create isochrone center point
        this.handler.setInputAction((event: any) => {
            const earthPosition = this.map.viewer.scene.pickPosition(event.position);
            if (!earthPosition) return;

            this.removePointEntity();
            
            this.pointEntity = this.dataSource.entities.add({
                position: earthPosition,
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.RED,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
                },
            });
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };


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
            this.dataLoading = true;
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
                data.features.forEach((feature: any) => {
                    console.log("Isochrone Feature:", feature);
                    const props = feature.properties;
                    const isochroneNumber = props.isochrone;
                    const isochroneStart = props.isochroneStart;
                    const isochroneEnd = props.isochroneEnd;
                    const coordinates = feature.geometry.coordinates[0].map((coord: any) => {
                        return Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
                    });

                    const isochroneEntity = this.dataSource.entities.add({
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(coordinates),
                            material: Cesium.Color.BLUE.withAlpha(0.3),
                            heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
                        }
                    });

                    const isochrone: Isochrone = {
                        entity: isochroneEntity,
                        props: {
                            isochrone: isochroneNumber,
                            isochroneStart: isochroneStart,
                            isochroneEnd: isochroneEnd
                        }
                    };
                    this.isochrones.push(isochrone);
                    this.map.refresh();
                });
                console.log("Isochrones added to map:", this.isochrones);
            }
            else {
                console.warn("No features found in isochrone data");
            }
        } catch (error) {
            console.error("Failed to send request:", error);
        }
        finally {
            this.dataLoading = false;
        }
    };


    private XYFromEntity(entity: Cesium.Entity): { x: number, y: number } | undefined {
        if (!entity.position) return undefined;

        const position = entity.position.getValue(Cesium.JulianDate.now());
        if (!position) return undefined;

        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);

        return { x: longitude, y: latitude };
    };

    public entityToIsochrones(): void {
               // Calculate coordinates from the point entity
        if (!this.pointEntity) {
            console.warn("No point entity defined for isochrone calculation");
            return;
        }

        if (!this.apiKey) {
            console.warn("No API key defined for isochrone calculation");
            return;
        }

        const coords = this.XYFromEntity(this.pointEntity);
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
            this.apiKey
        );
    };
};
