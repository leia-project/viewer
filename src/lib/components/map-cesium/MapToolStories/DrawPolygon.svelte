<script lang="ts">
    import * as Cesium from "cesium";
	import { onMount, getContext, onDestroy, createEventDispatcher } from "svelte";
    import { polygonPositions } from "./PolygonStore";
	import { Button } from "carbon-components-svelte";
	import { Map } from "../module/map";
	import type { Story } from "./Story";
	import { StoryLayer } from "./StoryLayer";
    import area from '@turf/area';

    export let hasDrawnPolygon: boolean = false;
    export let map: Map;
    export let story: Story;
    export let distributions: Array<{ group: string; value: number }[]> = [];
    export let polygonArea: number;
    export let polygonEntity: Cesium.Entity | undefined;

    let handler: Cesium.ScreenSpaceEventHandler;
    let activeShapePoints: Cesium.Cartesian3[] = [];
    let activeShape: Cesium.Entity | undefined;
    let floatingPoint: Cesium.Entity | undefined;
    let redPoints: Cesium.Entity[] = [];
    let selectedAction: 'draw' | 'delete' | undefined = undefined;
    let geojson: any;
    let savedPolygonEntity: Cesium.Entity | undefined;

    //TODO: This polygon is not remembered. Should be saved in storyview. See comment there
    onMount(() => {
        console.log("DrawPolygon component mounted");

        if (polygonEntity) {
            map.viewer.entities.remove(polygonEntity);
        }
        if (savedPolygonEntity) {
            polygonEntity = savedPolygonEntity;
            map.viewer.entities.add(polygonEntity);
            debugger;
        }
	});

    //Note: component also destroys when polygon is drawn
    onDestroy(() => {
        console.log("DrawPolygon component destroyed");
        savedPolygonEntity = polygonEntity;
    });
    
    function transformDistribution(distribution: Record<string, number>): { group: string; value: number }[] {
		const result: { group: string; value: number }[] = [];

		for (let i = 1; i <= 5; i++) {
			const letter = String.fromCharCode(64 + i); // 65 = 'A'
			const value = distribution[i.toString()] ?? 0;
			result.push({ group: letter, value });
		}

		return result;
	}

    function drawShape(positionData: Cesium.Cartesian3[]) {
        return map.viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.CallbackProperty(() => {
                return new Cesium.PolygonHierarchy(positionData);
                }, false),
                material: Cesium.Color.RED.withAlpha(0.4),
                heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN
            },
        });
    }

    function draw() {
        if (hasDrawnPolygon) {
            return;
        }
        selectedAction = "draw";
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
                    heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
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
                polyline: {
                    positions: activeShapePoints.concat([activeShapePoints[0]]), // close the polygon
                    width: 2,
                    material: Cesium.Color.RED,
                    clampToGround: true
                }
            });

            activeShapePoints = [];
            activeShape = undefined;

        // Clear the drawing points
        redPoints.forEach((point) => map.viewer.entities.remove(point));
        redPoints = [];

        polygonPositions.set(activeShapePoints);
        map.viewer.scene.requestRender();
        hasDrawnPolygon = true;
        
        // sendAPIUpResponse();
        let storyLayers: Array<StoryLayer> = story.getStoryLayers();
        
        for (let i = 0; i < storyLayers.length; i++) {
            sendAnalysisRequest(storyLayers[i].url, storyLayers[i].featureName, geojson)
            .then(apiResponse => {
                const transformed = transformDistribution(apiResponse.distribution);
                distributions.push(transformed);
                console.log("Transformed distribution:", transformed);
            })
            .catch(error => 
                console.error("Error: ", error)
            );
            
        }
        selectedAction = undefined;
        polygonArea = area(geojson)
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };
    
    // Note: also resets if the polygon is still being drawn
    function deletePolygon() {
        activeShapePoints = [];

        if (redPoints) {
            redPoints.forEach((point) => map.viewer.entities.remove(point));
            redPoints = [];
        }

        if (floatingPoint) {
            map.viewer.entities.remove(floatingPoint);
            floatingPoint = undefined;
        }

        if (activeShape) {
            map.viewer.entities.remove(activeShape);
            activeShape = undefined;
        }

        if (polygonEntity) {
            map.viewer.entities.remove(polygonEntity);
            polygonEntity = undefined;
        }
        polygonPositions.set([]); // Clear stored points
        map.viewer.scene.requestRender();
        hasDrawnPolygon = false;
    }

    async function sendAnalysisRequest(url: string | undefined, featureName: string | undefined, geojson: any): Promise<any> {
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
                    geom: geom,  
                }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            return data;
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
    <h4>Teken Projectgebied</h4>
    <p>
        Teken een projectgebied in. Klik op de 'Draw new polygon' knop om te beginnen met tekenen op de kaart.
        Klik met de rechtermuisknop op de kaart om het tekenen te beëindigen.
    </p>
</div>

<div class="buttons">
    <Button 
        kind={selectedAction === "draw" ? "primary" : "tertiary"}
        on:click={() => {
            draw(); 
        }}
    >
        Draw new polygon
    </Button>

    <Button 
        kind="danger"
        on:click={() => {
            deletePolygon();
        }}
    >
        Delete Polygon
    </Button>
</div>

<style>

    .buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin: 1rem;
    }
    
</style>