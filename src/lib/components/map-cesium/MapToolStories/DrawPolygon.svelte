<script lang="ts">
    import * as Cesium from "cesium";
	import { _ } from "svelte-i18n";
    import { Button, Tooltip } from "carbon-components-svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
    import AreaCustom from "carbon-icons-svelte/lib/AreaCustom.svelte";
	import { Map } from "../module/map";
	import type { Story } from "./Story";
	import { StoryLayer } from "./StoryLayer";
    import area from '@turf/area';
    import * as turf from '@turf/turf';
	import { get, type Writable } from "svelte/store";
    import { onMount, onDestroy } from 'svelte';
    import { polygonStore } from './PolygonEntityStore';
 
    export let map: Map;
    export let story: Story;
    export let distributions: Array<{ group: string; value: number }[]> = [];
    export let polygonArea: number;
    export let hasDrawnPolygon: boolean;
    export let showPolygonMenu: Writable<boolean>;
        
    let polygonEntity: Cesium.Entity | null = null;
    let isDrawing = false;
    let handler: Cesium.ScreenSpaceEventHandler;
    let activeShapePoints: Cesium.Cartesian3[] = [];
    let activeShape: Cesium.Entity | undefined;
    let redPoints: Cesium.Entity[] = [];
    let selectedAction: 'draw' | 'delete' | undefined = undefined;
    let geojson: any;
    

    onMount(() => {
        const storedPolygonData = get(polygonStore);
        if (storedPolygonData.polygonEntity) {
            // Re-add the polygonEntity to the viewer if it was saved
            polygonEntity = storedPolygonData.polygonEntity;
            map.viewer.entities.add(polygonEntity);

            redPoints = storedPolygonData.redPoints;
            redPoints.forEach((point) => map.viewer.entities.add(point));

            distributions = storedPolygonData.distributions;
            hasDrawnPolygon = true;
        }
    });


    function checkPolygonForSelfIntersection(): boolean {
        const kinks = turf.kinks(geojson);
        if (kinks.features.length > 1) {
            return false;
        } else {
            return true;
        }
    }
    
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
        if (hasDrawnPolygon || isDrawing) {
            return;
        }
        isDrawing = true;
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
                activeShapePoints.push(earthPosition);
                activeShape = drawShape(activeShapePoints);
            }

            activeShapePoints.push(earthPosition);

        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Handle right click to finish drawing
        handler.setInputAction(() => {
            if (activeShapePoints.length < 4) {
                return;
            }            

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
            
            if (!checkPolygonForSelfIntersection()) {
                return;
            }

            handler.destroy();
            if (activeShape) { 
                map.viewer.entities.remove(activeShape);
            }

            // Now draw and clear
            polygonEntity = map.viewer.entities.add({
                polyline: {
                    positions: activeShapePoints.concat([activeShapePoints[0]]), // close the polygon
                    width: 2,
                    material: Cesium.Color.RED,
                    clampToGround: true
                }
            });

            redPoints.forEach((point) => map.viewer.entities.remove(point));
            redPoints = [];

            activeShapePoints = [];
            activeShape = undefined;

            hasDrawnPolygon = true;
            isDrawing = false;
            
            // sendAPIUpResponse();
            let storyLayers: Array<StoryLayer> = story.getStoryLayers();
            
            for (let i = 0; i < storyLayers.length; i++) {
                sendAnalysisRequest(storyLayers[i].url, storyLayers[i].featureName, geojson)
                .then(apiResponse => {
                    const transformed = transformDistribution(apiResponse.distribution);
                    distributions[i] = transformed;
                })
                .catch(error => 
                    console.error("Error: ", error)
                );
                
            }
            selectedAction = undefined;
            polygonArea = area(geojson)
            polygonStore.set({
                polygonEntity,
                redPoints,
                distributions
            });

            showPolygonMenu.set(false);

        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };
    
    function deletePolygon() {
        if (handler && !handler.isDestroyed()) {
            handler.destroy(); 
        }

        activeShapePoints = [];
        if (activeShape) map.viewer.entities.remove(activeShape);
        activeShape = undefined;

        if (polygonEntity) {
            map.viewer.entities.remove(polygonEntity);
            polygonEntity = null;
        }
        
        redPoints.forEach((point) => map.viewer.entities.remove(point));
        redPoints = [];
        
        distributions = [];
        isDrawing = false;
        map.viewer.scene.requestRender();
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
            const response = await fetch("https://virtueel.dev.zeeland.nl/ko_api/analyze", {
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

    onDestroy(() => {
        deletePolygon();
    });

</script>

{#if $showPolygonMenu}
    {#if !hasDrawnPolygon}
        <div>
            <div class="title-with-tooltip">
                <h4>{$_("tools.stories.drawPolygon")}</h4>
                <Tooltip align="start" direction="right">
                    {$_("tools.stories.drawPolygonText")}
                </Tooltip>
            </div>
        </div>
    {/if}

    <div class="buttons">
        <Button 
            icon={AreaCustom}
            kind={selectedAction === "draw" ? "primary" : "tertiary"}
            disabled={hasDrawnPolygon}
            on:click={() => {
                draw(); 
            }}
        >
            {$_("tools.stories.drawPolygon")}
        </Button>

        <Button 
            kind="danger"
            tooltipPosition="bottom"
            icon={TrashCan}
            disabled={!isDrawing && !hasDrawnPolygon}
            on:click={() => {
            deletePolygon();
            polygonStore.set({
                polygonEntity: null,
                redPoints: [],
                distributions: []
            });
            hasDrawnPolygon = false;
            }}
        >
            {$_("tools.stories.deletePolygon")}
        </Button>
    </div>
    <br><hr><br>
{/if}

<style>

    .buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin: 1rem;
    }

    .title-with-tooltip {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 99;
        margin-top: 0.5rem;
    }
    
</style>