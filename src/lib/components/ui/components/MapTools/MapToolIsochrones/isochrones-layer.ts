import * as Cesium from "cesium";
// import * as turf from "@turf/turf";
import type { Map } from "$lib/components/map-cesium/module/map";
import { get, writable, type Writable } from "svelte/store";


type IsochroneProps = {
    index: number, // counting from inside to outside
    isochroneStart: number,
    isochroneEnd: number,
    weight: number, // between 0 and 1
    population: number
};


export type Isochrone = {
    entity: Cesium.Entity,
    props: IsochroneProps
};


export class IsochronesLayer {
    private map: Map;
    private dataSource: Cesium.CustomDataSource;
    private storageLocation: string = "tool.isochrones.apiKey";

    public pointEntity: Cesium.Entity | undefined;
    public coordinates: Writable<{ x: number, y: number } | undefined> = writable(undefined);
    public handler: Writable<Cesium.ScreenSpaceEventHandler | undefined> = writable(undefined);
    public apiKey: Writable<string>;
    public dataLoading: Writable<boolean> = writable(false);
    public isochrones: Writable<Array<Isochrone>> = writable([]);
    public startWeights: Array<number>; // Inside to outside, should total 1
    public travelTime: number = 20; // in minutes
    public totalPopulation: Writable<number> = writable(10000); // TODO: make dynamic


    constructor(map: Map, startWeights: Array<number> = [0.5, 0.3, 0.2]) {
        this.map = map;
        this.startWeights = startWeights;

        const storedKey = localStorage.getItem(this.storageLocation) || "";
        this.apiKey = writable(storedKey);

        this.dataSource = new Cesium.CustomDataSource();
        this.map.viewer.dataSources.add(this.dataSource);

        this.isochrones.subscribe(isos => {
            this.redistributeWeights(isos);
            this.updateIsoColors(isos);

            this.map.refresh();
        });

        this.totalPopulation.subscribe(totalPop => {
            // Recalculate population for all isochrones when total population changes
            this.isochrones.update(isos => {
                return isos.map(iso => {
                    const population = Math.round(iso.props.weight * totalPop);
                    
                    // Update entity properties if they exist
                    if (iso.entity.properties) {
                        iso.entity.properties.population = population;
                    }
                    
                    return {
                        ...iso,
                        props: {
                            ...iso.props,
                            population: population
                        }
                    };
                });
            });
        });
    }


    private saveApiKeyToStorage(): void {
        localStorage.setItem(this.storageLocation, get(this.apiKey));
    }


    public resetLayer(): void {
        this.removeIsochrones();
        this.removePointEntity();
        this.coordinates.set(undefined);

        this.map.refresh();
    }


    private redistributeWeights(isos: Array<Isochrone>): void {
        // When the first isochrone weight changes, adjust others proportionally
        if (isos.length > 0) {
            const firstWeight = isos[0].props.weight;
            const remainingWeight = 1 - firstWeight;
            
            // Calculate the sum of the other start weights (excluding first)
            const otherStartWeightsSum = this.startWeights.slice(1).reduce((sum, w) => sum + w, 0);
            
            const totalPop = get(this.totalPopulation);
            
            // Update weights for all isochrones except the first
            isos.forEach((iso, index) => {
                if (index === 0) {
                    // First isochrone keeps its weight
                    iso.props.weight = Number(firstWeight.toFixed(2));
                    iso.props.population = Math.round(iso.props.weight * totalPop);
                    
                    // Also update the entity properties if they exist
                    if (iso.entity.properties) {
                        iso.entity.properties.weight = Number(firstWeight.toFixed(2));
                        iso.entity.properties.population = iso.props.population;
                    }
                } else {
                    // Other isochrones get proportional share of remaining weight
                    if (otherStartWeightsSum > 0) {
                        const newWeight = Number(((this.startWeights[index] / otherStartWeightsSum) * remainingWeight).toFixed(2));
                        iso.props.weight = newWeight;
                        iso.props.population = Math.round(newWeight * totalPop);
                        
                        // Also update the entity properties if they exist
                        if (iso.entity.properties) {
                            iso.entity.properties.weight = newWeight;
                            iso.entity.properties.population = iso.props.population;
                        }
                    } else {
                        // Fallback: distribute evenly if no start weights
                        const newWeight = Number((remainingWeight / (isos.length - 1)).toFixed(2));
                        iso.props.weight = newWeight;
                        iso.props.population = Math.round(newWeight * totalPop);
                        
                        // Also update the entity properties if they exist
                        if (iso.entity.properties) {
                            iso.entity.properties.weight = newWeight;
                            iso.entity.properties.population = iso.props.population;
                        }
                    }
                }
            });
        }
    }


    private updateIsoColors(isos: Array<Isochrone>): void {
        // Update colors based on calculated weights
        isos.forEach(iso => {
            const weight = iso.props.weight;

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
                ((1 - weight) * 120) / 360,  // Hue: 0 degrees (red) at weight=1, 120 degrees (green) at weight=0
                1.0,                         // Saturation
                0.5,                         // Lightness
                0.7                          // Alpha
            );

            iso.entity.polygon.material = new Cesium.ColorMaterialProperty(color);
        });
    }


    public getIsochrone(index: number): Isochrone | undefined {
        const isos = get(this.isochrones);
        return isos.find(iso => iso.props.index === index);
    }


    public getIsochroneWeight(index: number): number | undefined {
        const iso = this.getIsochrone(index);
        return iso ? iso.props.weight : undefined;
    }


    public show(): void {
        this.dataSource.show = true;
        this.map.refresh();
    }


    public hide(): void {
        this.dataSource.show = false;
        this.map.refresh();
    }


    public destroyHandler(): void {
        const handler = get(this.handler);
        if (handler && !handler.isDestroyed()) {
            handler.destroy();
            this.handler.set(undefined); // As defined in the documentation
        }
    }


    public removeIsochrones(): void {
        const isos = get(this.isochrones);
        if (isos.length > 0) {
            isos.forEach(iso => {
                this.dataSource.entities.remove(iso.entity);
            });
            this.map.refresh();
        }
    }


    public addPointEntity(): void {
        if (this.pointEntity) {
            this.dataSource.entities.add(this.pointEntity);
            this.map.refresh();
        }
    }


    public removePointEntity(): void {
        if (this.pointEntity) {
            this.dataSource.entities.remove(this.pointEntity);
            this.map.refresh();
        }
    }


    public updateIsochroneWeight(index: number, weight: number): void {
        if (weight < 0 || weight > 1) {
            console.warn("Weight must be between 0 and 1");
            return;
        }

        const roundedWeight = Number(weight.toFixed(2));
        const totalPop = get(this.totalPopulation);
        const population = Math.round(roundedWeight * totalPop);

        this.isochrones.update(isos => {
            const updatedIsos = isos.map(iso => {
                if (iso.props.index === index) {
                    return {
                        ...iso,
                        props: {
                            ...iso.props,
                            weight: roundedWeight,
                            population: population
                        }
                    };
                }
                return iso;
            });
            return updatedIsos;
        });
    }


    public drawPoint(): void {
        this.handler.set(new Cesium.ScreenSpaceEventHandler(this.map.viewer.canvas));

        // Handle left click to create isochrone center point
        get(this.handler)!.setInputAction((event: any) => {
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
    }


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
    ): Promise<void> {
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
                const totalPop = get(this.totalPopulation);
                const newIsochrones: Array<Isochrone> = [];
                let hole: Cesium.PolygonHierarchy[] | undefined = undefined;
                let hierarchy: Cesium.PolygonHierarchy;
                
                // TODO: Add increasing buffer around each isochrone to avoid holes extending beyond previous isochrones

                data.features.forEach((feature: any, index: number) => {
                    const props = feature.properties;
                    const isochroneNumber = props.isochrone;
                    const isochroneStart = props.isochroneStart;
                    const isochroneEnd = props.isochroneEnd;
                    const weight = startWeights[index];
                    const population = Math.round(weight * totalPop);
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
                            weight: weight,
                            population: population
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
                            weight: weight,
                            population: population
                        }
                    };
                    newIsochrones.push(isochrone);
                });
                this.saveApiKeyToStorage();

                this.isochrones.set(newIsochrones);
                this.map.refresh();
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
    }


    public entityToIsochrones(): void {
        if (!get(this.apiKey)) {
            console.warn("No API key defined for isochrone calculation");
            return;
        }

        const coords = get(this.coordinates);
        if (!coords) {
            console.warn("Failed to get coordinates from point entity");
            return;
        }
        const { x, y } = coords;
        const travelSteps: Array<number> = this.startWeights.map(() => this.travelTime);

        // Calculates isochrones and displays them on the map
        this.calculateCarIosochrones(
            x, 
            y, 
            travelSteps,  // 20-minute isochrones
            true, 
            "time", 
            0.99, 
            get(this.apiKey)
        );
    }
};
