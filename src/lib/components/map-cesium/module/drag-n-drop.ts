/* Enable adding files to a Cesium map by file dropping on a DOM element through the use directive, e.g.: 
		<div use:dragDropEvents={{map}} >
		or with an option to enable/disable: <div use:dragDropEvents={{map: map, enabled: map.options.enableDragDropFiles}} >
*/

import { writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";

import { LayerConfig } from "$lib/components/map-core/layer-config";
import { LayerConfigGroup } from "$lib/components/map-core/layer-config-group";

import { Map } from "./map";
import { DraggableCollection } from "./layers/dropped-glb-layer";


interface DragDropParams {
	map: Map,
	enabled: Writable<boolean> | undefined
}


export function dragDropEvents(node: HTMLElement, params: DragDropParams): any {
	if (!params.map || !(params.map instanceof Map)) {
		console.log(`Dragging and dropping of file not enabled on ${node.nodeName} ${node.classList ? `Element classes: ${node.classList}` : ""} ${node.id ? `Element id: ${node.id}` : ""} \nError: No valid map provided`);
		return;
	}
	const enabler = params.enabled ?? writable(true); // If no store is provided, simply set to true

	enabler.subscribe((enabled) => {
		enabled ? addListeners(node, params.map) : removeListeners(node, params.map);
	});

	return {
		destroy() {
			removeListeners(node, params.map);
		}
	}
}

function addListeners(node: HTMLElement, map: Map): void {
	node.addEventListener('dragover', onDragOver);
	node.addEventListener('drop', (e) => onFileDropped(e, map));
}

function removeListeners(node: HTMLElement, map: Map): void {
	node.removeEventListener('dragover', onDragOver);
	node.removeEventListener('drop', (e) => onFileDropped(e, map));
}


function onDragOver(e: DragEvent): void {
	//const fileType = e.dataTransfer.items[0].type; if (fileType !== "application/json") //DoSomething: Type checking only works for common file types like JSON, JPG, SVG, CSV;
	e.preventDefault();
}


function onFileDropped(e: DragEvent, map: Map): void {
	e.preventDefault();
	if (!e.dataTransfer) return;
	const file = e.dataTransfer.files[0];
	const fileName = file.name;
	if (fileName.endsWith("json")) {
		try {
			parseDroppedGeoJSON(file, map);
		} catch (e) {
			console.log(e);
		}
	}
	else if (fileName.endsWith(".glb")) {
		const dropLocation = map.viewer.scene.pickPosition(new Cesium.Cartesian2(e.offsetX, e.offsetY));
		parseDroppedGLB(file, map, dropLocation);
	}
}


async function parseDroppedGeoJSON(file: File, map: Map): Promise<void> {
	const geojsonURL = URL.createObjectURL(file);

	// First check
	const test = await fetch(geojsonURL);
	const geojson = await test.json();
	if (geojson.type !== "FeatureCollection") return;

	createGroupIfNotExists(map, "dragDropped", "Drag-and-dropped layers");
	const config = new LayerConfig({
		title: file.name,
		type: "geojson",
		id: (Math.random()*100000000 + 1).toString(),
		groupId: "dragDropped",
		defaultOn: true,
		settings: {
			url: geojsonURL,
			dragDropped: true
		}
	});
	map.layerLibrary.addLayerConfig(config);
	config.added.set(true);
}



let glbCollection!: DraggableCollection;
function parseDroppedGLB(file: File, map: Map, location: Cesium.Cartesian3): void {
	const objectUrl = URL.createObjectURL(file);
	if (!glbCollection) {
		createGroupIfNotExists(map, "dragDropped", "Drag-and-dropped layers");
		const layerId = (Math.random()*100000000 + 1).toString();
		const datasource = new Cesium.CustomDataSource(layerId);
		const handler = new Cesium.ScreenSpaceEventHandler(map.viewer.canvas);
		glbCollection = new DraggableCollection(map, datasource, handler);

		const glbConfig = new LayerConfig({
			title: file.name,
			type: "dropped-glb",
			id: layerId,
			groupId: "dragDropped",
			defaultOn: true,
			settings: {
				collection: writable(glbCollection), // Temporary fix: Writable, because otherwise the layer info in the library crashes
				dragDropped: true
			}
		});
		map.layerLibrary.addLayerConfig(glbConfig);
		glbConfig.added.set(true);

	}
	glbCollection.add(location, objectUrl);
}


function createGroupIfNotExists(map: Map, groupId: string, groupName: string): void {
	if (!map.layerLibrary.findGroup(groupId)) {
		map.layerLibrary.addLayerConfigGroup(new LayerConfigGroup(groupId, groupName));
	}
}