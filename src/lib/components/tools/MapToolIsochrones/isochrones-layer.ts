import { get, writable, type Writable } from "svelte/store";
import { _ } from "svelte-i18n";
import * as Cesium from "cesium";
import type { Map } from "$lib/map-cesium/map";
import type { GeoJsonLayer } from "$lib/map-cesium/layers/geojson-layer";
import { notifications } from "$lib/map-core/notifications/notifications";
import { Notification } from "$lib/map-core/notifications/notification";
import { NotificationType } from "$lib/map-core/notifications/notification-type";


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


// Outer ring of an isochrone in lon/lat, with its bounding box for a cheap pre-test.
type IsoRing = {
    ring: Array<[number, number]>,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
};

// One centroid (lon/lat) and attribute value per plan feature, in parallel arrays.
type FeatureIndex = {
    count: number,
    lon: Float64Array,
    lat: Float64Array,
    value: Float64Array
};


function toIsoRing(ring: Array<[number, number]>): IsoRing {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    return { ring, minX, minY, maxX, maxY };
}


function isPointInIsoRing(x: number, y: number, iso: IsoRing): boolean {
    if (x < iso.minX || x > iso.maxX || y < iso.minY || y > iso.maxY) return false;
    // Ray casting
    const ring = iso.ring;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}


// Bounding-box centre of a GeoJSON geometry (any type), or undefined when it has no coordinates.
function geometryCenter(geometry: any): [number, number] | undefined {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const visit = (coords: any): void => {
        if (typeof coords[0] === "number") {
            if (coords[0] < minX) minX = coords[0];
            if (coords[0] > maxX) maxX = coords[0];
            if (coords[1] < minY) minY = coords[1];
            if (coords[1] > maxY) maxY = coords[1];
        } else {
            for (const child of coords) visit(child);
        }
    };
    if (geometry?.coordinates) visit(geometry.coordinates);
    return minX === Infinity ? undefined : [(minX + maxX) / 2, (minY + maxY) / 2];
}


function buildFeatureIndex(features: Array<any> | undefined, attribute: string): FeatureIndex {
    const list = Array.isArray(features) ? features : [];
    const lon = new Float64Array(list.length);
    const lat = new Float64Array(list.length);
    const value = new Float64Array(list.length);
    let count = 0;
    for (const feature of list) {
        const amount = Number(feature?.properties?.[attribute]);
        // Features without a value cannot contribute to the accounted population.
        if (!Number.isFinite(amount) || amount === 0) continue;
        const center = geometryCenter(feature.geometry);
        if (!center) continue;
        lon[count] = center[0];
        lat[count] = center[1];
        value[count] = amount;
        count++;
    }
    return { count, lon, lat, value };
}


export class IsochronesLayer {
    private map: Map;
    public apiUrl: string;
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
    private prepared: Promise<void> | undefined;
    private featureIndex: FeatureIndex | undefined;
    private isoRings: Array<IsoRing> = [];

    public pointEntity: Cesium.Entity | undefined;
    public coordinates: Writable<{ x: number, y: number } | undefined> = writable(undefined);
    public handler: Writable<Cesium.ScreenSpaceEventHandler | undefined> = writable(undefined);
    public dataLoading: Writable<boolean> = writable(false); // The whole calculation: isochrones + plan data
    public dataPreparing: Writable<boolean> = writable(false); // Only the plan data download
    public isochrones: Writable<Array<Isochrone>> = writable([]);
    public startWeights: Array<number>; // Inside to outside, should total 1
    public parts: number; // Number of isochrones to generate
    public travelTime: number = 20; // in minutes
    public totalPopulation: Writable<number> = writable(10000); // TODO: make dynamic


    constructor(map: Map, apiUrl: string, dataLayer: GeoJsonLayer, dataAttribute: string, startWeights: Array<number> = [0.5, 0.3, 0.2]) {
        this.map = map;
        this.dataLayer = dataLayer;
        this.apiUrl = apiUrl;
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


    /**
     * Fetch the plan data and reduce it to a compact index (one centroid + one value per feature).
     * Only the attribute and the centroid are needed, so the layer is deliberately not materialised
     * as Cesium entities: that kept a full copy of every polygon alive for no reason. This downloads
     * the whole plan dataset, so it is deferred to the first activation of the tool (or the first
     * calculation) instead of running on `configLoaded`. Latched, so every entry point can await it;
     * a failed load is not latched, so the next call retries.
     */
    public prepare(): Promise<void> {
        if (!this.prepared) {
            this.prepared = this.loadFeatureIndex().catch((error) => {
                this.prepared = undefined;
                throw error;
            });
        }
        return this.prepared;
    }


    private async loadFeatureIndex(): Promise<void> {
        const url = this.dataLayer?.config.settings?.url;
        if (typeof url !== "string" || url === "") {
            throw new Error("The accounted population growth layer has no settings.url to read");
        }
        this.dataPreparing.set(true);
        try {
            const start = performance.now();
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const geojson = await response.json();
            this.featureIndex = buildFeatureIndex(geojson?.features, this.dataAttribute);
            console.debug(`isochrones: ${this.featureIndex.count} features indexed in ${Math.round(performance.now() - start)} ms`);
        } finally {
            this.dataPreparing.set(false);
        }
    }


    /** Fetch the isochrones and the plan data in parallel, then assign the accounted population. */
    public async calculate(): Promise<void> {
        this.dataLoading.set(true);
        try {
            await Promise.all([this.entityToIsochrones(), this.prepare()]);
            this.addDataValuesToIsochrones();
        } catch (error) {
            console.error("isochrones: calculation failed", error);
            const notification = new Notification(
                NotificationType.ERROR,
                get(_)("general.notifications.error"),
                get(_)("tools.isochrones.calculationFailed"),
                5000,
                true,
                true
            );
            notification.error = error instanceof Error ? error : new Error(String(error));
            notifications.send(notification);
        } finally {
            this.dataLoading.set(false);
        }
    }


    public addDataValuesToIsochrones(): void {
        const start = performance.now();
        const index = this.featureIndex;
        if (!index || this.isoRings.length === 0) {
            console.warn("No isochrones or plan data available to assign accounted population");
            return;
        }

        // Each feature counts for the innermost isochrone containing its centroid (the isochrones are nested).
        const accountedPerIso = new Array<number>(this.isoRings.length).fill(0);
        for (let i = 0; i < index.count; i++) {
            const lon = index.lon[i];
            const lat = index.lat[i];
            for (let j = 0; j < this.isoRings.length; j++) {
                if (isPointInIsoRing(lon, lat, this.isoRings[j])) {
                    accountedPerIso[j] += Math.round(index.value[i] * this.conversionFactor);
                    break;
                }
            }
        }

        this.isochrones.update(isos => {
            return isos.map((iso, i) => {
                const accountedPopulation = accountedPerIso[i] ?? 0;
                const unaccountedPopulation = iso.props.population - accountedPopulation;

                if (iso.entity.properties) {
                    iso.entity.properties.accountedPopulation = accountedPopulation;
                    iso.entity.properties.unaccountedPopulation = unaccountedPopulation;
                }

                return {
                    ...iso,
                    props: {
                        ...iso.props,
                        accountedPopulation: accountedPopulation,
                        unaccountedPopulation: unaccountedPopulation
                    }
                };
            });
        });
        console.debug(`isochrones: ${index.count} features assigned in ${Math.round(performance.now() - start)} ms`);
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
        this.isoRings = [];
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
                const newRings: Array<IsoRing> = [];
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
                    newRings.push(toIsoRing(feature.geometry.coordinates[0]));
                    const coordinates = feature.geometry.coordinates[0].map((coord: any) => {
                        return Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
                    });

                    if (hole) {
                        hierarchy = new Cesium.PolygonHierarchy(coordinates, hole);
                    }
                    else {
                        hierarchy = new Cesium.PolygonHierarchy(coordinates);
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
                this.isoRings = newRings;
                this.isochrones.set(newIsochrones);
                this.map.refresh();
            }
            else {
                console.warn("No features found in isochrone data");
            }
        } catch (error) {
            console.error("Failed to send request:", error);
            throw error;
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
