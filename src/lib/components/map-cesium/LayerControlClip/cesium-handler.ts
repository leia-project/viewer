//FINN TODO: Clean this up also copy clip.ts and cliphandler from map-cesium

import { type Writable, writable, get, type Unsubscriber } from "svelte/store";
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

import type { Map } from "../module/map";
import { CameraLocation } from "$lib/components/map-core/camera-location";

// import type { BatchRepository } from "./batches/batch-repository";
// import { type SoilLocation, type SoilBatch, Excavation } from "./batches/batch";
// import { CesiumMapLayer } from "./cesium-map/cesium-map-layer";
// import { ExcavationEditor } from "./excavating/excavation-editor";
// import { ExcavationRender } from "./excavating/excavation-render";
// import { Cache } from "./cache";
// import { subsurfaceSettings } from "./options/subsurface-settings";
// import { polygonToCartesians } from "./subsurface-helpers";


export class CesiumHandler {

	public map: Map;
	public active: Writable<SoilBatch | undefined>;
	public hovered: Writable<SoilLocation | undefined>;
	public editingTrench: Writable<SoilBatch | undefined> = writable(undefined);
	public displayedExcavation: Excavation | undefined;
	public repository: BatchRepository;
	
	public trenchEditor: ExcavationEditor;
	public cesiumMapLayer: CesiumMapLayer;

	public processing: Writable<boolean> = writable(false);

	private geoTopUnsubscriber!: Unsubscriber;
	private activeUnsubscriber!: Unsubscriber;
	private editUnsubscriber!: Unsubscriber;

	public entityCache: Cache;
	public clipCache: Cache;
	public unclippedTilesets: Array<string> = new Array();
	private geometriesToBeDestroyed: ExcavationRender | undefined;
	
	public maxDepth: number = 20;

	constructor(cesiumMap: Map, repository: BatchRepository, active: Writable<SoilBatch | undefined>, hovered: Writable<SoilLocation | undefined>) {
		this.map = cesiumMap;
		this.active = active;
		this.hovered = hovered;
		this.displayedExcavation = undefined;
		this.repository = repository;
		this.trenchEditor = new ExcavationEditor(cesiumMap);
		this.cesiumMapLayer = new CesiumMapLayer(cesiumMap, repository, active, hovered, this.processing);
		this.entityCache = new Cache();
		this.clipCache = new Cache();
		this.setup();
	}

	private setup(): void {
		this.activeUnsubscriber = this.active.subscribe((obj) => this.activate(obj));

		this.geoTopUnsubscriber = subsurfaceSettings.showGeoTOP.subscribe((b) => {
			const activeEntities = this.entityCache.get(get(this.active));
			if (activeEntities) activeEntities.showGeoTop.set(b);
		});
		
		this.editUnsubscriber = this.editingTrench.subscribe((t) => {
			this.exitTrenchEdit();
			if (t instanceof Excavation) this.startTrenchEdit(t);
		});

		this.repository.on("itemRemoved", this.deleteItem);
	}

	public destroy(): void {
		this.activeUnsubscriber();
		this.geoTopUnsubscriber();
		this.editUnsubscriber();
		this.repository.off("itemRemoved", this.deleteItem);
		this.trenchEditor.destroy();
		this.cesiumMapLayer.destroy();
	}
	
	private deleteItem = (e: any): void => {
		if (e.item === get(this.active)) this.active.set(undefined);
		if (e.item instanceof Excavation) {
			this.clearCache(e.item);
			this.map.refresh();
		}
	}

	public async activate(object: SoilBatch | undefined, useCache: boolean = true, zoomTo: boolean = true): Promise<void> {
		if (get(this.processing) === true) return;
		this.processing.set(true);

		if (object !== get(this.editingTrench)) this.editingTrench.set(undefined);

		if (object === undefined) {
			if (this.displayedExcavation) this.deactivateExcavation(this.displayedExcavation);
			this.cesiumMapLayer.matchLayer.reset();
		}

		if (object && zoomTo) this.zoomTo(object);

		if (object instanceof Excavation) {
			object.enableDynamicUpdates();
			const tempPolygon = this.tempPolygon(object);
			if (this.displayedExcavation && object !== this.displayedExcavation) {
				this.deactivateExcavation(this.displayedExcavation);
			}
			await this.showEntities(object, useCache);
			if (this.geometriesToBeDestroyed) {
				this.geometriesToBeDestroyed.removeFromCesiumMap(this.map);
				this.geometriesToBeDestroyed.destroy(this.map);
			}
			this.clipExcavation(object, useCache);
			this.displayedExcavation = object;
			this.map.viewer.entities.remove(tempPolygon);
		}
		this.map.refresh();
		this.processing.set(false);
	}

	private tempPolygon(excavation: Excavation): Cesium.Entity {
		const geom = get(excavation.geometryOriginal);
		const positions = geom ? polygonToCartesians(geom) : [];
		const polygon = this.map.viewer.entities.add({
			polygon: {
				hierarchy: {
					positions: positions,
					holes: []
				},
				material: Cesium.Color.GRAY.withAlpha(0.5),
				show: true
			}
		});
		return polygon;
	}

	private deactivateExcavation(excavation: Excavation): void {
		if (this.entityCache.get(excavation)) {
			const entities = this.entityCache.get(excavation);
			entities.show.set(false);
		}
		this.map.clipHandler.removeClipById(excavation.uuid);
		if (this.trenchEditor.excavation === excavation) this.trenchEditor.finishEditing();
		this.displayedExcavation = undefined;
		this.map.refresh();
	}

	public exitTrenchEdit(): void {
		const editedTrench = this.trenchEditor.excavation;
		if (!editedTrench) return;

		if (this.trenchEditor.polygonChanged) {
			this.clearCache(editedTrench, false);
			if (editedTrench === get(this.active)) this.activate(editedTrench, true, false); // If you click on save button of another trench, do not do this
		}
		this.trenchEditor.finishEditing();
		this.entityCache.get(editedTrench)?.updateBottomPlaneDepth(true);
		this.repository.excavationRepository.updateLocalStorage();
	}
	

	public startTrenchEdit(excavation: Excavation): void {
		if (excavation !== get(this.active)) {
			this.active.set(excavation);
		}
		this.trenchEditor.activateEditMode(excavation);
		this.entityCache.get(excavation)?.updateBottomPlaneDepth(false, this.map); // Smooth animation for bottom plane
	}


	public clipExcavation(excavation: Excavation, useCache: boolean = true): void {
		let clipObj: Cesium.ClippingPlaneCollection | Array<Cesium.ClippingPolygon> | undefined;
		const cached = this.clipCache.get(excavation);
		if (cached && useCache) {
			clipObj = this.clipCache.get(excavation);
		} else {
			if (cached) this.clipCache.delete(excavation);
			const polygon = get(excavation.geometryOriginal);
			clipObj = this.map.clipHandler.getClip([polygon], false);
			this.clipCache.put(excavation, clipObj);
		}
		if (!clipObj) return;
		this.map.clipHandler.removeClipById(excavation.uuid);
		this.map.clipHandler.clip({
			clipId: excavation.uuid,
			clip: clipObj,
			outside: false,
			clipTilesets: true,
			unclippedTilesets: this.unclippedTilesets,
			box: false
		}, 10);
	}
	
	private async showEntities(excavation: Excavation, useCache: boolean = true): Promise<void> {
		return new Promise(async (resolve) => {
			if (excavation !== undefined) {
				let entities: ExcavationRender;
				const cached = this.entityCache.get(excavation);
				if (cached && useCache) {
					entities = this.entityCache.get(excavation);
				} else {
					if (cached) this.entityCache.delete(excavation);
					entities = new ExcavationRender(excavation, this.maxDepth);
					entities.addToCesiumMap(this.map);
					this.entityCache.put(excavation, entities);  //Remove entities from map if cache limit exceeded
					await entities.drawTrench(this.map);
				}
				entities.setVisibilitySlices(get(excavation.depth));
				entities.showGeoTop.set(get(subsurfaceSettings.showGeoTOP));
				entities.show.set(true); 
			}
			setTimeout(() => resolve(), 100); // --> prevent black flash
		});
	}


	public clearCache(excavation: Excavation, deleteGeometriesDirectly: boolean = true): void {
		if (this.clipCache.get(excavation)) this.clipCache.delete(excavation);
		const geometries = this.entityCache.get(excavation) as ExcavationRender;
		this.entityCache.delete(excavation);
		if (geometries && deleteGeometriesDirectly) {
			geometries.removeFromCesiumMap(this.map);
			geometries.destroy(this.map);
		} else if (geometries) {
			this.geometriesToBeDestroyed = geometries;
		}
	}

	public zoomTo(object: SoilLocation): void {
		const loc = get(object.pointLocation);

		// Determine height offset from the billboard items on the map that have been clamped to the terrain through a terrainMostDetailed request. If not available (i.e. newly made trench) --> skip zoom
		const heightOffset = this.cesiumMapLayer.iconLayer.getEllipsoidHeightOffsetFromIcon(object);
		if (heightOffset === undefined) return;
		const bbox = object instanceof Excavation ? turf.bbox(turf.polygon([get(object.geometryOriginal)])) : turf.bbox(turf.point(loc));
		const width = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[1]]), {units: "radians"});
		const length = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[0], bbox[3]]), {units: "radians"});
		
		const offsetY = object instanceof Excavation ? turf.radiansToLength(Math.max(width, length), "degrees") * 2.5 : 0.002;
		let z = object instanceof Excavation ? Math.max(8, turf.radiansToLength(Math.max(width, length), "meters") * 1.3) : 150;
		z += heightOffset;

		const cameraLocation = new CameraLocation(
				loc[0],
				loc[1] - offsetY,
				z,
				0,		// heading
				-30,	// pitch
				1.5		// duration
			);
		this.map.flyTo(cameraLocation);
	}

}
