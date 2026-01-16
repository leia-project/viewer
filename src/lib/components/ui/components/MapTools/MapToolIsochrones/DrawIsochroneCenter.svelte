<script lang="ts">
    import * as Cesium from "cesium";
    import { Map } from "$lib/components/map-cesium/module/map";
	import { Button } from "carbon-components-svelte";

    export let map: Map;

    let handler: Cesium.ScreenSpaceEventHandler;
    let isDrawing: boolean = false;
    let pointEntity: Cesium.Entity | undefined;

    function drawPoint() {
        isDrawing = true;
        handler = new Cesium.ScreenSpaceEventHandler(map.viewer.canvas);

        // Handle left click to create isochrone center point
        handler.setInputAction((event: any) => {
            const earthPosition = map.viewer.scene.pickPosition(event.position);
            if (!earthPosition) return;

            if (pointEntity) {
                map.viewer.entities.remove(pointEntity);
            }
            
            pointEntity = map.viewer.entities.add({
                position: earthPosition,
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.RED,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
                },
            });

            console.log("Point Entity:", pointEntity);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    };

    //	https://services.geodan.nl/routing/v2/isochrone/auto?x=3.608&y=51.499&direction=from&steps=20&steps=40&steps=60&overlap=true&output=polygon&calculationMode=time&precision=0.95&apikey=fcafb0dc-efb6-496b-9780-4a71ee54e1ad
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
        console.log("API URL:", apiUrl);

        try {
            const response = await fetch(apiUrl, {
                method: "GET"
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json();

            return data;
        } catch (error) {
            console.error("Failed to send request:", error);
            return undefined;
        }
    }

</script>


<Button
    on:click={() => {
        console.log("Draw Isochrone Center clicked")
        drawPoint();
        }}
    >
    Draw Isochrone Center
</Button>


<Button
    on:click={() => {
            console.log("Stop Drawing clicked")
            if (handler && !handler.isDestroyed()) {
                handler.destroy(); 
            }
            isDrawing = false;
        }}
    >
    Stop Drawing
</Button>


<Button
    on:click={() => {
            console.log("Calculate Isochrones clicked")
            // Calculates isochrones and displays them on the map
            calculateCarIosochrones(
                3.608, 
                51.499, 
                [20, 20, 20],  // 20-minute isochrones
                true, 
                "time", 
                0.95, 
                "KEY"
            ).then((data) => {
                console.log("Isochrone Data:", data);
                // Process and display the isochrone polygons on the map
                if (data?.features) {
                    data.features.forEach((feature) => {
                        const coordinates = feature.geometry.coordinates[0];
                        console.log("Isochrone Coordinates:", coordinates);
                        // const coordinates = feature.geometry.coordinates[0].map((coord: any) => {
                        //     return Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
                        // });

                        // map.viewer.entities.add({
                        //     polygon: {
                        //         hierarchy: new Cesium.PolygonHierarchy(coordinates),
                        //         material: Cesium.Color.BLUE.withAlpha(0.5),
                        //         heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
                        //     }
                        // });
                    });
                }
            });
            
        }}
>
    Calculate isochrones
</Button>
<style>

</style>