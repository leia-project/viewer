import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import type { Map } from "$lib/components/map-cesium/module/map";
import { get, writable, type Writable } from "svelte/store";
import type { GeoJsonLayer } from "$lib/components/map-cesium/module/layers/geojson-layer";


type IsochroneProps = {
    index: number, // counting from inside to outside
    isochroneStart: number,
    isochroneEnd: number,
    weight: number, // between 0 and 1
    population: number,
    accountedPopulation: number, // Population in exisiting data that falls within the isochrone
    unaccountedPopulation: number // Population minus accountedPopulation
};


export type Isochrone = {
    entity: Cesium.Entity,
    props: IsochroneProps
};


export class IsochronesLayer {
    private map: Map;
    public dataLayer: GeoJsonLayer;
    private dataAttribute: string;
    private zeroOrNegativeColor: string = "#2DA44E";
    private positiveColors: Array<string> = [
        "#FEEBE7",
        "#FCC6BB",
        "#FAA18F",
        "#F87C63",
        "#F54927",
        "#F4320B",
        "#C82909",
        "#9C2007",
        "#701705",
        "#440E03"
    ];
    private conversionFactor: number = 0.041; // TODO DEBUG REVER TO 2.1 - Estimated factor to convert data attribute value to population
    private dataSource: Cesium.CustomDataSource;
    private storageLocation: string = "tool.isochrones.apiKey";

    public pointEntity: Cesium.Entity | undefined;
    public coordinates: Writable<{ x: number, y: number } | undefined> = writable(undefined);
    public handler: Writable<Cesium.ScreenSpaceEventHandler | undefined> = writable(undefined);
    // public apiKey: Writable<string>;
    public apiUrl: string = "https://ors.bertha.geodan.nl/ors/v2/isochrones/driving-car"
    public dataLoading: Writable<boolean> = writable(false);
    public isochrones: Writable<Array<Isochrone>> = writable([]);
    public startWeights: Array<number>; // Inside to outside, should total 1
    public parts: number; // Number of isochrones to generate
    public travelTime: number = 20; // in minutes
    public totalPopulation: Writable<number> = writable(10000); // TODO: make dynamic


    constructor(map: Map, dataLayer: GeoJsonLayer, dataAttribute: string, startWeights: Array<number> = [0.5, 0.3, 0.2]) {
        this.map = map;
        this.dataLayer = dataLayer;
        this.dataAttribute = dataAttribute;
        this.startWeights = startWeights;
        this.parts = this.startWeights.length;

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
                    const unaccountedPopulation = population - iso.props.accountedPopulation;
                    
                    // Update entity properties if they exist
                    if (iso.entity.properties) {
                        iso.entity.properties.population = population;
                        iso.entity.properties.unaccountedPopulation = unaccountedPopulation;
                    }
                    
                    return {
                        ...iso,
                        props: {
                            ...iso.props,
                            population: population,
                            unaccountedPopulation: unaccountedPopulation
                        }
                    };
                });
            });
        });

    }


    public addDataValuesToIsochrones(): void {
        const dataSource = this.dataLayer.source;
        const entities = dataSource.entities.values;
        console.log("Entities in data source: ", entities);
        entities.forEach(entity => {
            if (entity.polygon && entity.properties) {
                console.log(`Processing entity ${entity.id} with properties: `, entity.properties);

                const isos = get(this.isochrones);
                if (!isos || isos.length === 0) {
                    console.warn("No isochrones available to check for centroid inclusion");
                    return;
                }

                for (let i = 0; i < isos.length; i++) {
                    const iso = isos[i];
                    let accounted = 0; // MAX possible value is 142.953

                    if (iso.entity.polygon) {
                        // calculate centroid of polygon
                        const hierarchy = entity.polygon.hierarchy?.getValue(Cesium.JulianDate.now());
                        const centroid = Cesium.BoundingSphere.fromPoints(hierarchy.positions).center;
                        const turfCoord = turf.point([centroid.x, centroid.y]);
                        const isoPolygon = iso.entity.polygon.hierarchy?.getValue(Cesium.JulianDate.now()).positions.map((pos: Cesium.Cartesian3) => [pos.x, pos.y]);
                        const turfIsoPolygon = turf.polygon([isoPolygon]);

                        const isInsideIso = turf.booleanPointInPolygon(turfCoord, turfIsoPolygon);

                        // Add data attribute value to isochrone properties if centroid is within isochrone polygon
                        if (isInsideIso) {
                            // console.log(`Centroid of entity ${entity.id} is inside isochrone ${iso.props.index}`);

                            // Calculate population that is accounted for with existing building plans
                            if (entity.properties?.[this.dataAttribute]) {
                                accounted = Math.round(entity.properties[this.dataAttribute] * this.conversionFactor);
                                // console.log(`Accounted value for entity ${entity.id} is ${accounted}`);
                            }
                            else {
                                console.warn(`Data attribute ${this.dataAttribute} not found in entity properties`);
                            }

                            // DEBUG: add each centroid as entity to the map
                            this.map.viewer.entities.add({
                                position: centroid,
                                point: {
                                    pixelSize: 4,
                                    color: Cesium.Color.BLUE,
                                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                                    heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN
                                },
                            });
                            this.map.refresh();

                            // Update accountedPopulation and the entity properties
                            iso.props.accountedPopulation += accounted;

                            if (iso.entity.properties) {
                                iso.entity.properties.accountedPopulation = iso.props.accountedPopulation;
                            }

                        }
                        // break; // Stop checking other isochrones for this entity since it can only be in one
                    }
                }
            }
        });

        this.isochrones.update(isos => {
            return isos.map(iso => {
                const unaccountedPopulation = iso.props.population - iso.props.accountedPopulation;

                if (iso.entity.properties) {
                    iso.entity.properties.unaccountedPopulation = unaccountedPopulation;
                }

                return {
                    ...iso,
                    props: {
                        ...iso.props,
                        unaccountedPopulation: unaccountedPopulation
                    }
                };
            });
        });
    }


    public resetLayer(): void {
        this.removeIsochrones();
        this.removePointEntity();
        this.destroyHandler();
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
                    iso.props.unaccountedPopulation = iso.props.population - iso.props.accountedPopulation;
                    
                    // Also update the entity properties if they exist
                    if (iso.entity.properties) {
                        iso.entity.properties.weight = Number(firstWeight.toFixed(2));
                        iso.entity.properties.population = iso.props.population;
                        iso.entity.properties.unaccountedPopulation = iso.props.unaccountedPopulation;
                    }
                } else {
                    // Other isochrones get proportional share of remaining weight
                    if (otherStartWeightsSum > 0) {
                        const newWeight = Number(((this.startWeights[index] / otherStartWeightsSum) * remainingWeight).toFixed(2));
                        iso.props.weight = newWeight;
                        iso.props.population = Math.round(newWeight * totalPop);
                        iso.props.unaccountedPopulation = iso.props.population - iso.props.accountedPopulation;
                        
                        // Also update the entity properties if they exist
                        if (iso.entity.properties) {
                            iso.entity.properties.weight = newWeight;
                            iso.entity.properties.population = iso.props.population;
                            iso.entity.properties.unaccountedPopulation = iso.props.unaccountedPopulation;
                        }
                    } else {
                        // Fallback: distribute evenly if no start weights
                        const newWeight = Number((remainingWeight / (isos.length - 1)).toFixed(2));
                        iso.props.weight = newWeight;
                        iso.props.population = Math.round(newWeight * totalPop);
                        iso.props.unaccountedPopulation = iso.props.population - iso.props.accountedPopulation;
                        
                        // Also update the entity properties if they exist
                        if (iso.entity.properties) {
                            iso.entity.properties.weight = newWeight;
                            iso.entity.properties.population = iso.props.population;
                            iso.entity.properties.unaccountedPopulation = iso.props.unaccountedPopulation;
                        }
                    }
                }
            });
        }
    }


    private updateIsoColors(isos: Array<Isochrone>): void {
        // Update colors based on unaccounted population ratio
        const totalPop = get(this.totalPopulation);

        isos.forEach(iso => {
            if (!iso.entity.polygon) {
                console.warn(`Isochrone polygon not found`);
                return;
            }

            const color = this.getIsoColor(iso.props.unaccountedPopulation, totalPop);

            iso.entity.polygon.material = new Cesium.ColorMaterialProperty(color);
        });
    }


    private getIsoColor(unaccountedPopulation: number, totalPopulation: number): Cesium.Color {
        if (unaccountedPopulation <= 0 || totalPopulation <= 0) {
            return Cesium.Color.fromCssColorString(this.zeroOrNegativeColor).withAlpha(0.7);
        }

        const clampedUnaccountedPopulation = Math.min(unaccountedPopulation, totalPopulation);
        const normalizedUnaccountedPopulation = clampedUnaccountedPopulation / totalPopulation;

        return this.getGradientColor(normalizedUnaccountedPopulation);
    }


    private getGradientColor(normalizedValue: number): Cesium.Color {
        const clampedNormalizedValue = Math.max(0, Math.min(normalizedValue, 1));
        const colorCount = this.positiveColors.length;

        if (colorCount === 0) {
            return Cesium.Color.fromCssColorString(this.zeroOrNegativeColor).withAlpha(0.7);
        }

        if (colorCount === 1) {
            return Cesium.Color.fromCssColorString(this.positiveColors[0]).withAlpha(0.7);
        }

        const scaledIndex = clampedNormalizedValue * (colorCount - 1);
        const lowerIndex = Math.floor(scaledIndex);
        const upperIndex = Math.ceil(scaledIndex);
        const interpolationFactor = scaledIndex - lowerIndex;

        const lowerColor = Cesium.Color.fromCssColorString(this.positiveColors[lowerIndex]);
        const upperColor = Cesium.Color.fromCssColorString(this.positiveColors[upperIndex]);
        const interpolatedColor = Cesium.Color.lerp(lowerColor, upperColor, interpolationFactor, new Cesium.Color());

        return interpolatedColor.withAlpha(0.7);
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
                    const unaccountedPopulation = population - iso.props.accountedPopulation;
                    return {
                        ...iso,
                        props: {
                            ...iso.props,
                            weight: roundedWeight,
                            population: population,
                            unaccountedPopulation: unaccountedPopulation
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


    // Uses self-hosted Isochrone API to calculate isochrones for car travel:
    // https://giscience.github.io/openrouteservice/run-instance/running-with-docker
    private async calculateCarIsochronesORS(
        x: number,
        y: number,
        totalTime: number
    ): Promise<void> {
        const partialTime = Math.round(totalTime / this.parts);

        const body = {
            "id": "my_request",
            "locations": [
                [
                    x,
                    y
                ]
            ],
            "location_type": "start",
            "range": [
                totalTime
            ],
            "range_type": "time",
            "units": "m",
            "options": {
                "avoid_borders": "controlled"
            },
            "area_units": "m",
            "intersections": false,
            "attributes": [
                "area"
            ],
            "interval": partialTime,
            "smoothing": 0
        };

        this.destroyHandler(); // Stop drawing

        try {
            this.dataLoading.set(true);
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // Add CORS header
                    'Access-Control-Allow-Methods': 'POST', // Allow methods
                },
                body: JSON.stringify(body),
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
                
                data.features.forEach((feature: any, index: number) => {
                    // const props = feature.properties;
                    const isochroneNumber = index + 1;
                    const isochroneStart = partialTime * index;
                    const isochroneEnd = partialTime * (index + 1);
                    const weight = startWeights[index];
                    const population = Math.round(weight * totalPop);
                    const accountedPopulation = 0;
                    const coordinates = feature.geometry.coordinates[0].map((coord: any) => {
                        return Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
                    });

                    if (hole) {
                        hierarchy = new Cesium.PolygonHierarchy(coordinates, hole);
                        console.log(`Creating isochrone ${isochroneNumber} with hole from previous isochrone`);
                    }
                    else {
                        hierarchy = new Cesium.PolygonHierarchy(coordinates);
                        console.log(`Creating isochrone ${isochroneNumber} without hole`);
                    }

                    const unaccountedPopulation = population - accountedPopulation;
                    const isochroneEntity = this.dataSource.entities.add({
                        polygon: {
                            hierarchy: hierarchy,
                            material: Cesium.Color.WHITE.withAlpha(0.7),
                            outline: true,
                            outlineColor: Cesium.Color.BLACK,
                            heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN
                        },
                        properties: {
                            index: isochroneNumber,
                            isochroneStart: isochroneStart,
                            isochroneEnd: isochroneEnd,
                            weight: weight,
                            population: population,
                            accountedPopulation: accountedPopulation,
                            unaccountedPopulation: unaccountedPopulation
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
                            population: population,
                            accountedPopulation: accountedPopulation,
                            unaccountedPopulation: unaccountedPopulation
                        }
                    };
                    newIsochrones.push(isochrone);
                });
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


    public async entityToIsochrones(): Promise<void> {
        const coords = get(this.coordinates);
        if (!coords) {
            console.warn("Failed to get coordinates from point entity");
            return;
        }
        const { x, y } = coords;
        const travelTimeSeconds = this.travelTime * 60 * this.parts; // Convert minutes to seconds

        await this.calculateCarIsochronesORS(
            x, 
            y, 
            travelTimeSeconds
        );
    }
};
