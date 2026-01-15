<script lang="ts">
    import * as Cesium from "cesium";
	import { _, t } from "svelte-i18n";
    import { Button, TooltipIcon } from "carbon-components-svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
    import AreaCustom from "carbon-icons-svelte/lib/AreaCustom.svelte";
    import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";
    import Information from "carbon-icons-svelte/lib/Information.svelte";
	import { Map } from "../module/map";
	import type { Story } from "./Story";
	import { StoryLayer } from "./StoryLayer";
    import area from '@turf/area';
    import * as turf from '@turf/turf'; 
	import { get, type Writable } from "svelte/store";
    import { onMount, onDestroy } from 'svelte';
    import { polygonStore } from './PolygonEntityStore';
    import { FileUploaderItem } from "carbon-components-svelte";
    import CustomFileUploader from "./CustomFileUploader.svelte";
    import { InlineNotification } from "carbon-components-svelte";
	import { parse } from "cookie";
    import initGdalJs from 'gdal3.js';
    import workerUrl from 'gdal3.js/dist/package/gdal3.js?url'
    import dataUrl from 'gdal3.js/dist/package/gdal3WebAssembly.data?url'
    import wasmUrl from 'gdal3.js/dist/package/gdal3WebAssembly.wasm?url'
    import { exportDataPages } from "./StoryChart/StoryChartExportDataPages";

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
    let uploadedFile: any[] = [];
    let validationErrors: Record<string, string> = {};
    let fileUploaded: boolean = false;
    let hasUploadedPolygon: boolean = false;
    let errorMessage: string;

    let drawButtonEnabled: boolean = true;
    let uploadButtonEnabled: boolean = true;
    let deleteButtonEnabled: boolean = false;
    let completeButtonEnabled: boolean = false;

    const paths = {wasm: wasmUrl, data: dataUrl, js: workerUrl};

    onMount(() => {
        const storedPolygonData = get(polygonStore);
        if (storedPolygonData.polygonEntity) {
            // Re-add the polygonEntity to the viewer if it was saved
            polygonEntity = storedPolygonData.polygonEntity;
            map.viewer.entities.add(polygonEntity);

            // Not manditory
            if (redPoints) {
                redPoints = storedPolygonData.redPoints;
                redPoints.forEach((point) => map.viewer.entities.add(point));
            }

            distributions = storedPolygonData.distributions;
            hasDrawnPolygon = true;
        }

        drawButtonEnabled = storedPolygonData.polygonEntity ? false : true;
        uploadButtonEnabled = storedPolygonData.polygonEntity ? false : true;
        deleteButtonEnabled = storedPolygonData.polygonEntity ? true : false;
    });


    function checkPolygonForSelfIntersection(): boolean {
        const kinks = turf.kinks(geojson); // 1 kink is from closing the polygon

        if (kinks.features.length > 1) {
            errorMessage = $_("errors.Drawing.invalidPolygon")
            console.warn(errorMessage);
            return false;
        } else {
            errorMessage = "";
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
        setButtonStates(undefined, false, true, true);

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
            handleFinishDrawing();
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    function handleFinishDrawing() {
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
        hasUploadedPolygon = false;
        isDrawing = false;

        setButtonStates(false, false, true, false);
        
        // sendAPIUpResponse();
        let storyLayers: Array<StoryLayer> = story.getStoryLayers();
        
        for (let i = 0; i < storyLayers.length; i++) {
            sendAnalysisRequest(storyLayers[i].url, storyLayers[i].featureName, geojson, story.statisticsApi)
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
    }

    function handleFinishUpload() {
        let storyLayers: Array<StoryLayer> = story.getStoryLayers();
        
        for (let i = 0; i < storyLayers.length; i++) {
            sendAnalysisRequest(storyLayers[i].url, storyLayers[i].featureName, geojson, story.statisticsApi)
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

        hasDrawnPolygon = true;
        hasUploadedPolygon = true;
        uploadedFile = [];

        setButtonStates(false, false, true, false);

        showPolygonMenu.set(false);
    }
    
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

    async function sendAnalysisRequest(url: string | undefined, featureName: string | undefined, geojson: any, statisticsApi: string): Promise<any> {
        if (!url || !featureName) {
            console.warn("URL or featureName undefined, not able to get the analysis request");
            return;
        }
        // Extract the inner geometry part from the GeoJSON Feature for the "geom" field
        const geom = {
            geometry: geojson.geometry
        };

        try {
            const response = await fetch(statisticsApi, {
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


    function handleFiles(e: CustomEvent<readonly File[]>) {
        uploadedFile = [...e.detail];
        if (uploadedFile.length > 0) {
            const file = uploadedFile[0];
            validationErrors = {};
            if (file.name.endsWith(".geojson")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    try {
                        let geojsonFile = JSON.parse(content);
                        if (geojsonFile.features.length === 1) {
                            const feature = geojsonFile.features[0];
                            if (feature.geometry && feature.geometry.type === "Polygon") {
                                try {
                                    geojson = feature;
                                    const coords = geojson.geometry.coordinates[0];
                                    const positions = coords.map(([lng, lat]: [number, number]) =>
                                        Cesium.Cartesian3.fromDegrees(lng, lat)
                                    );
                                    polygonEntity = map.viewer.entities.add({
                                        polyline: {
                                            positions: positions,
                                            width: 2,
                                            material: Cesium.Color.RED,
                                            clampToGround: true
                                        }
                                    });
                                    fileUploaded = true;
                                    setButtonStates(false, false, true, true);
                                } catch (err) {
                                    setButtonStates(false, false, true, false);
                                    validationErrors = {...validationErrors, [file.name]: `Error parsing GeoJSON. ${err}`};
                                }
                            } else {
                                setButtonStates(false, false, true, false);
                                validationErrors = {...validationErrors, [file.name]: "GeoJSON must be of type 'Polygon', no 'multipolygon','line' or 'point' allowed."};
                            }
                        } else {
                            setButtonStates(false, false, true, false);
                            validationErrors = {...validationErrors, [file.name]: "GeoJSON must contain exactly one feature."};
                        }
                    } catch (err) {
                        setButtonStates(false, false, true, false);
                        validationErrors = {...validationErrors, [file.name]: `Error parsing GeoJSON. ${err}`};
                    }
                };
                reader.readAsText(file);
            } else if (file.name.endsWith(".gpkg")) {
                initGdalJs({paths}).then(async (Gdal) => {
                    if (((await Gdal.open(file)).datasets[0].info.layers.length) === 1) {
                        try {
                            const result = (await Gdal.open(file)).datasets[0];
                            const options = ['-f', 'GeoJSON', '-t_srs', 'EPSG:4326'];
                            const outPath = await Gdal.ogr2ogr(result, options);
                            const bytes = await Gdal.getFileBytes(outPath);
                            geojson = JSON.parse(new TextDecoder("utf-8").decode(bytes)).features[0];
                            if (geojson.geometry && geojson.geometry.type === "Polygon") {
                                const coords = geojson.geometry.coordinates[0];
                                const positions = coords.map(([lng, lat]: [number, number]) =>
                                    Cesium.Cartesian3.fromDegrees(lng, lat)
                                );
                                polygonEntity = map.viewer.entities.add({
                                    polyline: {
                                        positions: positions,
                                        width: 2,
                                        material: Cesium.Color.RED,
                                        clampToGround: true
                                    }
                                });
                                fileUploaded = true;     
                                setButtonStates(false, false, true, true);
                            } else {
                                setButtonStates(false, false, true, false);
                                validationErrors = {...validationErrors, [file.name]: "GeoPackage must be of type 'Polygon', no 'multipolygon','line' or 'point' allowed."};
                            };
                        } catch (err) {
                            setButtonStates(false, false, true, false);
                            validationErrors = {...validationErrors, [file.name]: `Error parsing GeoPackage. ${err}`};
                        };
                    } else {
                        setButtonStates(false, false, true, false);
                        validationErrors = {...validationErrors, [file.name]: "GeoPackage must contain exactly one layer."};
                    };
                });   
            } else {
                setButtonStates(false, false, true, false);
                validationErrors = {...validationErrors, [file.name]: "Invalid file type. Only .geojson or .gpkg allowed."};
            };
        };
        hasUploadedPolygon = true;
    };

    function setButtonStates(drawButton?: boolean, uploadButton?: boolean, deleteButton?: boolean, completeButton?: boolean) {
        if (drawButton !== undefined) drawButtonEnabled = drawButton;
        if (uploadButton !== undefined) uploadButtonEnabled = uploadButton;
        if (deleteButton !== undefined) deleteButtonEnabled = deleteButton;
        if (completeButton !== undefined) completeButtonEnabled = completeButton;
    };

</script>

{#if $showPolygonMenu}
    {#if !hasDrawnPolygon}
        <div>
            <div class="title-with-tooltip">
                <h4>{$_("tools.stories.polygonTitle")}</h4>
                <TooltipIcon  
                    align="start"
                    direction="right"
                    tooltipText={$_("tools.stories.drawPolygonText")}
                    icon={Information}
                />
            </div>
        </div>
    {/if}

    <div class="buttons">
        <div class="left-column">
            <Button 
                icon={AreaCustom}
                kind={isDrawing ? "primary" : "tertiary"}
                disabled={!drawButtonEnabled} 
                on:click={() => {
                    draw();
                }}
            >
                {$_("tools.stories.drawPolygon")}
            </Button>

            <CustomFileUploader
                kind = "tertiary"
                multiple = {false} 
                disabled={!uploadButtonEnabled}
                accept={[".geojson", ".gpkg"]}
                labelText={validationErrors ? $_("tools.stories.uploadPolygon") : (fileUploaded ? $_("tools.stories.uploadPolygon") : $_("tools.stories.uploadPolygon"))}
                on:change={handleFiles}
            />

            {#each uploadedFile as file}
                {#if validationErrors[file.name]}
                    <FileUploaderItem
                        id={file.name}
                        name={file.name}
                        invalid
                        errorSubject={validationErrors[file.name]}
                        status="edit"
                        on:delete={(e) => {
                            uploadedFile = [];
                        }}
                    />
                {:else}
                    <FileUploaderItem
                        id={file.name}
                        name={file.name}
                        status= "complete"
                    />
                {/if}
            {/each}
       
        </div>

        <div class="right-column">
            <Button 
                class="delete-polygon-button"
                kind="danger"
                tooltipPosition="bottom"
                icon={TrashCan}
                disabled={!deleteButtonEnabled}
                on:click={() => {
                    setButtonStates(true, true, false, false);

                    // Reset polygon data
                    deletePolygon();
                    polygonStore.set({
                        polygonEntity: null,
                        redPoints: [],
                        distributions: []
                    });
                    uploadedFile = [];
                    distributions = [];
                    hasDrawnPolygon = false;
                    hasUploadedPolygon = false;
                    exportDataPages.set({
                        pages: []
                    });
                }}
            >
                {$_("tools.stories.deletePolygon")}
            </Button>

            <Button
                on:click={() => {
                    isDrawing ? handleFinishDrawing() : handleFinishUpload();
                }}
                icon={ Checkmark }
                disabled={!completeButtonEnabled}
            >
                {$_("tools.stories.finishPolygon")}
            </Button>
        </div>
    </div>

    {#if errorMessage}
        <InlineNotification
            lowContrast
            timeout={5000}
            title="Error"
            subtitle={errorMessage}
            on:close={() => { errorMessage = ""; }}
        />
    {/if}

    <br><hr><br>
{/if}

<style> 

    .buttons {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        margin-top: 1rem;
        gap: 1rem;
    }

    .left-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }

    .right-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
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