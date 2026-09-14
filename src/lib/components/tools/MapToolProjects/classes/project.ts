import { get, type Unsubscriber } from "svelte/store";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { LayerConfigGroup } from "$lib/map-core/layer-config-group";

import type { Map } from "$lib/map-cesium/map";
import { getTerrainHeight } from "$lib/map-cesium/terrain-util";
import { projectHandler, type IProjectConfig } from "../project-handler";
import { FocusArea } from "./focus-area";
import { ProjectLayer } from "./project-layer";
import {
	getPolygonCenter,
	polygonToCartesians
} from "$lib/map-cesium/helpers";

import defaultMarker from "../icons/icon-asset.svg";

export abstract class CesiumProjectBase<
	IConfig extends IProjectConfig,
	MapLayer extends ProjectLayer
> extends FocusArea {
	public uuid: string = uuidv4();
	public name: string;
	public projectConfig: IConfig;
	public layers: Array<MapLayer>;
	public marker: Cesium.Entity | null;
	public polygon: Cesium.Entity;
	public refreshOnConnectorUpdate: boolean;
	private terrainUnsubscriber: Unsubscriber | undefined;

	get isSelected(): boolean {
		return get(projectHandler.selectedProject) === this;
	}

	constructor(
		map: Map,
		projectConfig: IConfig,
		animationTime: number = 1500,
		refreshOnConnectorUpdate: boolean = true,
		createMarker: boolean = true
	) {
		super(map, projectConfig.polygon, animationTime, projectConfig.cameraPosition, false);
		this.refreshOnConnectorUpdate = refreshOnConnectorUpdate;
		this.name = projectConfig.name;
		this.map.layerLibrary.addLayerConfigGroup(new LayerConfigGroup(this.uuid, this.name));
		this.projectConfig = projectConfig;
		this.center = getPolygonCenter(this.coordinates);
		this.layers =
			projectConfig.layers
				?.map((layer) => this.createMapLayer(layer.id, layer.on, layer.tileset))
				.filter((layer) => layer !== undefined) ?? [];
		this.marker = createMarker ? this.createMarker() : null;
		this.polygon = this.createPolygon();
		this.terrainUnsubscriber = this.map.options.terrainSwitchReady.subscribe(() =>
			this.updateMarkerHeight()
		);
	}

	public abstract createMapLayer(
		id: string,
		on: boolean,
		tileset: string | undefined
	): MapLayer | undefined;

	private onConnectorFetched = (): void => {
		if (this.isSelected) this.showProjectLayers(true);
	};

	public activate(): void {
		this.processing.set(true);
		this.projectCamera.bound(this.animationTime);
		this.projectHighlight.show = true;
		if (this.marker) this.marker.show = false;
		this.polygon.show = false;

		// time: add option to overrule refreshOnConnectorUpdate per project in config
		// For RWS we start the Cesium Viewer and directly load the project, most of the time the connector is not yet fetched
		// this results in Cesium loading the layers multiple times and downloading a lot of data twice.
		// We have CKAN as a connector for RWS but we do not use default layers from CKAN
		if (this.refreshOnConnectorUpdate) {
			this.map.on("Connector fetched", this.onConnectorFetched); // Otherwise CKAN layers are not shown when the project is activated on viewer load
		}

		setTimeout(() => {
			this.showProjectLayers();
			this.cutout(get(projectHandler.clip));
			this.processing.set(false);
		}, this.animationTime);
	}

	public deactivate(): void {
		this.resetLayers();
		this.projectCamera.unbound();
		this.cutout(false);
		this.projectHighlight.show = false;
		if (this.marker) this.marker.show = true;
		this.polygon.show = true;
		this.map.off("Connector fetched", this.onConnectorFetched);
		this.map.viewer.scene.requestRender();
	}

	public showProjectLayers(forceReset: boolean = false): void {
		if (forceReset) this.resetLayers();
		this.layers.forEach((layer: MapLayer) => layer.addToMap());
		this.map.refresh();
	}

	private resetLayers(): void {
		this.layers.forEach((layer: MapLayer) => layer.removeFromMap());
	}

	private destroy(): void {
		if (this.isSelected) this.deactivate();
		this.terrainUnsubscriber?.();
	}

	private createMarker(): Cesium.Entity {
		const marker = new Cesium.Entity({
			position: Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1]),
			billboard: new Cesium.BillboardGraphics({
				image: this.projectConfig.icon ?? defaultMarker,
				scale: 0.75,
				verticalOrigin: this.projectConfig.iconVerticalOrigin
					? this.originStringToVerticalOrigin(this.projectConfig.iconVerticalOrigin)
					: Cesium.VerticalOrigin.BOTTOM,
				horizontalOrigin: this.projectConfig.iconHorizontalOrigin
					? this.originStringToHorizontalOrigin(this.projectConfig.iconHorizontalOrigin)
					: Cesium.HorizontalOrigin.CENTER,
				scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1.0, 3.0e6, 0.1)
			})
		});
		return marker;
	}

	private originStringToVerticalOrigin(input: string): Cesium.VerticalOrigin {
		const lowerInput = input.toLowerCase();
		switch (lowerInput) {
			case "bottom":
				return Cesium.VerticalOrigin.BOTTOM;
			case "center":
				return Cesium.VerticalOrigin.CENTER;
			case "top":
				return Cesium.VerticalOrigin.TOP;
			default:
				return Cesium.VerticalOrigin.BOTTOM; // Default to bottom if input is invalid
		}
	}

	private originStringToHorizontalOrigin(input: string): Cesium.HorizontalOrigin {
		const lowerInput = input.toLowerCase();
		switch (lowerInput) {
			case "left":
				return Cesium.HorizontalOrigin.LEFT;
			case "center":
				return Cesium.HorizontalOrigin.CENTER;
			case "right":
				return Cesium.HorizontalOrigin.RIGHT;
			default:
				return Cesium.HorizontalOrigin.CENTER; // Default to center if input is invalid
		}
	}

	private async updateMarkerHeight(): Promise<void> {
		if (!this.marker) {
			return;
		}

		let terrainHeight: number = 0;
		if (this.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
			terrainHeight =
				(await getTerrainHeight(this.map, this.center[0], this.center[1])) || 0;
		}
		terrainHeight += 1;
		this.marker.position = new Cesium.ConstantPositionProperty(
			Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1], terrainHeight)
		);
	}

	private createPolygon(): Cesium.Entity {
		const c3 = polygonToCartesians(this.coordinates);
		const polygon = new Cesium.Entity({
			polygon: {
				hierarchy: c3,
				material: Cesium.Color.BLACK.withAlpha(0.3)
			}
		});
		return polygon;
	}
}

export class CesiumProject extends CesiumProjectBase<IProjectConfig, ProjectLayer> {
	createMapLayer(id: string, on: boolean, tileset: string | undefined) {
		return new ProjectLayer(this.map, id, on, tileset, this.uuid);
	}
}
