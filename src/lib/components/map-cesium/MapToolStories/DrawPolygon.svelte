<script lang="ts">
    import * as Cesium from "cesium";
    import { polygonPositions } from "./PolygonStore";
    import { onMount } from "svelte";
    import { page } from '$app/stores';
	import { Map } from "../module/map";
	import type { Story } from "./Story";
	import { StoryLayer } from "./StoryLayer";

    export let hasDrawnPolygon: boolean = false;
    export let map: Map;
    export let story: Story;

    let handler: Cesium.ScreenSpaceEventHandler;
    let activeShapePoints: Cesium.Cartesian3[] = [];
    let activeShape: Cesium.Entity | undefined;
    let floatingPoint: Cesium.Entity | undefined;
    let polygonEntity: Cesium.Entity | undefined;
    let redPoints: Cesium.Entity[] = [];
    let selectedAction: 'draw' | 'delete' | null = null;
    let geojson: any;


    function drawShape(positionData: Cesium.Cartesian3[]) {
        return map.viewer.entities.add({
        polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(positionData);
            }, false),
            material: Cesium.Color.YELLOW.withAlpha(0.6),
        },
        });
    }

    function draw() {
        if (hasDrawnPolygon) {
            console.log("Already drawn a polygon, first delete the old one");
            return;
        }
        handler = new Cesium.ScreenSpaceEventHandler(map.viewer.canvas);

        // Handle left click to create polygon points
        handler.setInputAction((event: any) => {
            const earthPosition = map.viewer.scene.pickPosition(event.position);
            if (!earthPosition) return;
            
            const pointEntity = map.viewer.entities.add({
                position: earthPosition,
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.RED,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
            });
            redPoints.push(pointEntity);

            if (activeShapePoints.length === 0) {
                floatingPoint = map.viewer.entities.add({
                    position: earthPosition,
                    point: {
                        pixelSize: 5,
                        color: Cesium.Color.RED,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });

                activeShapePoints.push(earthPosition);
                activeShape = drawShape(activeShapePoints);
            }

            activeShapePoints.push(earthPosition);
            map.viewer.scene.requestRender();

        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Handle right click to finish drawing
        handler.setInputAction(() => {
            if (activeShapePoints.length < 4) {
                console.log("Need to draw at least 3 points (4 total) to form a polygon!");
                return;
            }
            handler.destroy();
            if (floatingPoint) map.viewer.entities.remove(floatingPoint);
            if (activeShape) map.viewer.entities.remove(activeShape);

            const coords = activeShapePoints.map((cartesian) => {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                return [
                    Cesium.Math.toDegrees(cartographic.longitude),
                    Cesium.Math.toDegrees(cartographic.latitude)
                ];
            });

            // Ensure the polygon is closed
            if  (
                coords.length > 0 &&
                (coords[0][0] !== coords[coords.length - 1][0] ||
                coords[0][1] !== coords[coords.length - 1][1])
            )   {
                coords.push(coords[0]);
            }

            geojson = {
                type: "Feature",
                geometry: {
                type: "Polygon",
                coordinates: [coords]
                },
                properties: {}
            };

            // Now draw and clear
            polygonEntity = map.viewer.entities.add({
                polygon: {
                hierarchy: activeShapePoints,
                material: Cesium.Color.BLUE.withAlpha(0.2),
                },
            });

            activeShapePoints = [];
            activeShape = undefined;

        polygonPositions.set(activeShapePoints);
        map.viewer.scene.requestRender();
        hasDrawnPolygon = true;
        
        // sendAPIUpResponse();
        let storyLayers: Array<StoryLayer> = story.getStoryLayers();
        
        for (let i = 0; i < storyLayers.length; i++) {
            let kaas = sendAnalysisRequest(storyLayers[i].url, storyLayers[i].featureName, geojson);
        }

        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        };
    
    function deletePolygon() {
        if (!hasDrawnPolygon) {
            console.log("First draw a polygon before you can delete one");
            return;
        }

        if (floatingPoint) map.viewer.entities.remove(floatingPoint);
        if (activeShape) map.viewer.entities.remove(activeShape);
        if (polygonEntity) {
            map.viewer.entities.remove(polygonEntity);
            polygonEntity = undefined;
        }
        redPoints.forEach((point) => map.viewer.entities.remove(point));
        redPoints = [];
        polygonPositions.set([]); // Clear stored points
        map.viewer.scene.requestRender();
        hasDrawnPolygon = false;
    }

    async function sendAnalysisRequest(url: string | undefined, featureName: string | undefined, geojson: any) {
        if (!url || !featureName) {
            console.warn("url or featureName undefined, not able to get the analysis request");
            return;
        }
        // Extract the inner geometry part from the GeoJSON Feature for the "geom" field
        const geom = {
            geometry: geojson.geometry
        };
        
        try {
            const response = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    rasterUrl: url,
                    featureName: featureName,
                    geom: geom,  // match the backend expected structure here
                }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Response from server:", data);
        } catch (error) {
            console.error("Failed to send request:", error);
        }
    }

    async function sendAPIUpResponse() {
        try {
            const response = await fetch("http://localhost:8000", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
            });

            if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Response from server:", data);
        } catch (error) {
            console.error("Failed to send request:", error);
        }
    }
</script>

<div>
    <button on:click={() => {
        draw(); 
        selectedAction = "draw";
    }} 
    class="{selectedAction === 'draw' ? 'button-selected' : 'button-normal'}">Draw new polygon</button>

    <button on:click={() => {
        deletePolygon();
        selectedAction = 'delete';
    }}
    class="button-normal">Delete polygon</button>
</div>

<style>
    button {
        width: 49%;
        margin-bottom: 1rem;
    }
    .button-normal {
        background-color: grey;
    }

    .button-selected {
        background-color: lightslategray;
    }
</style>