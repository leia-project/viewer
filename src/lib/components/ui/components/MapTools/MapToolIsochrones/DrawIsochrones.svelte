<script lang="ts">
    import * as Cesium from "cesium";
    import { Map } from "$lib/components/map-cesium/module/map";
	import { Button } from "carbon-components-svelte";
	import { onDestroy, onMount } from "svelte";
    import { PasswordInput } from "carbon-components-svelte";


    // TODO: rewrite isochrones to class with methods
    import type { Isochrone } from "./Isochrone";
    import { isochrones } from "./Isochrone";

    export let map: Map;

    let pointEntity: Cesium.Entity | undefined;
    let handler: Cesium.ScreenSpaceEventHandler;
    let apiKey: string = "";

    onMount(() => {
        console.log("DrawIsochroneCenter mounted");
        addStoredIsochrones();
        addStoredPointEntity(); // Does not work
    });


    onDestroy(() => {
        console.log("DrawIsochroneCenter destroyed");
        destroyHandler();
        removeIsochrones();
        removePointEntity();
    });


    function removeIsochrones() {
        if (isochrones.length > 0) {
            isochrones.forEach(isochrone => {
                map.viewer.entities.remove(isochrone.entity);
            });
            map.refresh();
        }
    }


    function removePointEntity() {
        if (pointEntity) {
            map.viewer.entities.remove(pointEntity);
            map.refresh();
        }
    }


    function destroyHandler() {
        if (handler && !handler.isDestroyed()) {
            handler.destroy();
        }
    }


    function addStoredIsochrones() {
        if (isochrones.length > 0) {
            isochrones.forEach(isochrone => {
                map.viewer.entities.add(isochrone.entity);
            });
            map.refresh();
        }
    }


    function addStoredPointEntity() {
        if (pointEntity) {
            map.viewer.entities.add(pointEntity);
            map.refresh();
        }
    }


    function drawPoint() {
        handler = new Cesium.ScreenSpaceEventHandler(map.viewer.canvas);

        // Handle left click to create isochrone center point
        handler.setInputAction((event: any) => {
            const earthPosition = map.viewer.scene.pickPosition(event.position);
            if (!earthPosition) return;

            removePointEntity();
            
            pointEntity = map.viewer.entities.add({
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
    async function calculateCarIosochrones(
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
        destroyHandler(); // Stop drawing

        try {
            const response = await fetch(apiUrl, {
                method: "GET"
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json();
            
            // Process and display the isochrone polygons on the map
            if (data?.features) {
                removeIsochrones();
                data.features.forEach((feature: any) => {
                    console.log("Isochrone Feature:", feature);
                    const props = feature.properties;
                    const isochroneNumber = props.isochrone;
                    const isochroneStart = props.isochroneStart;
                    const isochroneEnd = props.isochroneEnd;
                    const coordinates = feature.geometry.coordinates[0].map((coord: any) => {
                        return Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
                    });

                    const isochroneEntity = map.viewer.entities.add({
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(coordinates),
                            material: Cesium.Color.BLUE.withAlpha(0.3),
                            heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
                        }
                    });
                    map.refresh();

                    const isochrone: Isochrone = {
                        entity: isochroneEntity,
                        props: {
                            isochrone: isochroneNumber,
                            isochroneStart: isochroneStart,
                            isochroneEnd: isochroneEnd
                        }
                    };
                    isochrones.push(isochrone);
                });
                console.log("Isochrones added to map:", isochrones);
            }
            else {
                console.warn("No features found in isochrone data");
            }
        } catch (error) {
            console.error("Failed to send request:", error);
        }
    };

    function XYFromEntity(entity: Cesium.Entity): { x: number, y: number } | undefined {
        if (!entity.position) return undefined;

        const position = entity.position.getValue(Cesium.JulianDate.now());
        if (!position) return undefined;

        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);

        return { x: longitude, y: latitude };
    }

</script>


<Button
    kind="tertiary"
    on:click={() => {
        console.log("Draw Isochrone Center clicked")
        drawPoint();
        }}
    >
    Draw Isochrone Center
</Button>


<PasswordInput
    labelText="API Key"
    bind:value={apiKey}
    placeholder="Enter GeodanMaps API key here..."
/>


<Button
    kind="tertiary"
    disabled={!pointEntity || !apiKey}
    on:click={() => {
            console.log("Calculate Isochrones clicked");

            // Calculate coordinates from the point entity
            if (!pointEntity) {
                console.warn("No point entity defined for isochrone calculation");
                return;
            }

            const coords = XYFromEntity(pointEntity);
            if (!coords) {
                console.warn("Failed to get coordinates from point entity");
                return;
            }
            const { x, y } = coords;


            // Calculates isochrones and displays them on the map
            calculateCarIosochrones(
                x, 
                y, 
                [20, 20, 20],  // 20-minute isochrones
                true, 
                "time", 
                0.99, 
                apiKey
            );
        }}
>
    Calculate isochrones
</Button>


<style>

</style>