import { CustomLayer } from "./custom-layer";
import * as Cesium from "cesium";

import type { Map } from "../map";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";
import { Dispatcher } from "$lib/components/map-core/event/dispatcher";
import LayerControlModelAnimation from "../../LayerControls/LayerControlModelAnimation.svelte";
import { CesiumLayer } from "./cesium-layer";
import { get } from "svelte/store";

export class DroppedGLBLayer extends CesiumLayer<Cesium.CustomDataSource> {

	public collection!: DraggableCollection;

	constructor(map: Map, config: LayerConfig) {
        super(map, config);
		this.collection = get(this.config.settings.collection);
		this.source = this.collection.droppedItems;
		this.setup();
	}

	public addToMap(): void {
		this.map.viewer.dataSources.add(this.source);
		if (get(this.visible) === true) {
			this.show();
		} else {
			this.hide();
		}
	}

	public removeFromMap(): void {
		this.map.viewer.dataSources.remove(this.source);
	}

	public opacityChanged(opacity: number): void {
		
	}

	public show(): void {
		if (this.source) {
			this.source.show = true;
            this.map.refresh();
        }
    }
    public hide(): void {
        if (this.source) {
            this.source.show = false;
			this.collection?.deactivate();
            this.map.refresh();
        }
	}

	private setup(): void {
		this.collection.on("updated", () => {
			this.updateCameraPosition();
		});

		const layerControl = new CustomLayerControl();
		layerControl.component = LayerControlModelAnimation;
		layerControl.props = {
			layer: this
		};
		this.addCustomControl(layerControl);
	}

	private updateCameraPosition(): void {
		const entityPositions = this.source.entities.values.map((entity: Cesium.Entity) => {
			return entity.position?.getValue(this.map.viewer.clock.currentTime);
		}).filter((position) => position !== undefined) as Cesium.Cartesian3[];
		if (entityPositions.length > 0) {
			const boundingSphere = Cesium.BoundingSphere.fromPoints(entityPositions);
			boundingSphere.radius += 100;
			if (boundingSphere) {
				//TODO: add option to use 2D or 3D camera position
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(boundingSphere);
			}
		}
	}
	
}


export class DraggableCollection extends Dispatcher {

	private map: Map;
	public droppedItems = new Cesium.CustomDataSource();
	private selectedEntity!: Cesium.Entity;
	private mousePosition!: Cesium.Cartesian2;
	private handler!: Cesium.ScreenSpaceEventHandler;
	public mode: "drag" | "rotate" | "remove" | "clone" = "drag";

	constructor(map: Map, datasource: Cesium.CustomDataSource, handler: Cesium.ScreenSpaceEventHandler) {
		super();
		this.map = map;
		this.droppedItems = datasource;
		this.handler = handler;
	}

	public activate(): void {
		if (!this.handler) this.handler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.canvas);
		this.addInputActions();
	}

	public deactivate(): void {
		//this.droppedItems.entities.removeAll();
		this.handler?.destroy();
	}

	public add(location: Cesium.Cartesian3, objectUrl: string): void {
		const entity = new Cesium.Entity({
			position: location,
			model: {
				uri: objectUrl
			}
		});
		this.droppedItems.entities.add(entity);
		this.onUpdate();
	}

	private remove(entity: Cesium.Entity): void {
		this.droppedItems.entities.remove(entity);
		this.onUpdate();
	}

	private clone(entity: Cesium.Entity): Cesium.Entity {
		const clone = new Cesium.Entity(entity);
		this.droppedItems.entities.add(entity);
		this.onUpdate();
		return clone;
	}

	private addInputActions(): void {
		this.handler.setInputAction((target: any): void => {
			const pickedObject = this.map.viewer.scene.pick(target.position);
			if (Cesium.defined(pickedObject) && this.droppedItems.entities.contains(pickedObject.id)) {
				if (this.mode === "drag") {
					this.selectedEntity = pickedObject.id;
					this.initDrag();
				} else if (this.mode === "clone") {
					const clone = this.clone(pickedObject.id);
					this.selectedEntity = clone;
					this.initDrag();
				} else if (this.mode === "remove") {
					this.remove(pickedObject.id);
				}
			}
		}, Cesium.ScreenSpaceEventType.LEFT_DOWN);
		
		this.handler.setInputAction((): void =>  {
			this.map.viewer.scene.screenSpaceCameraController.enableRotate = true;
			this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
			this.selectedEntity.position = new Cesium.ConstantPositionProperty(this.updatePosition());
			this.onUpdate();
		}, Cesium.ScreenSpaceEventType.LEFT_UP);
	}

	private initDrag(): void {
		this.map.viewer.scene.screenSpaceCameraController.enableRotate = false;
		this.handler.setInputAction((movement: any): void => {
			this.mousePosition = movement.endPosition;
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		//@ts-ignore
		this.selectedEntity.position = new Cesium.CallbackProperty(() => { return this.updatePosition() }, false);

	}

	private updatePosition(): Cesium.Cartesian3 | undefined {
		if (this.mousePosition) {
			let ray = this.map.viewer.camera.getPickRay(this.mousePosition);
			if (ray)
				return this.map.viewer.scene.globe.pick(ray, this.map.viewer.scene);
		}
	}


	public onUpdate(): void {
		const numberOfEntities = this.droppedItems.entities.values.length;
		if (numberOfEntities === 1) {
			this.activate();
		} else if (numberOfEntities === 0) {
			this.deactivate();
		}
		this.dispatch("updated", {});
	}
}