import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";
//import * as Shapefile from 'shapefile';
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import type { LayerConfig } from "$lib/components/map-core/layer-config";

import type { Map } from "../map";
import { CesiumLayer } from "./cesium-layer";
import LayerControlGeoJson from "../../LayerControlGeoJSON/LayerControlGeoJSON.svelte";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";

interface GeoJSON {
	type: string;
	name: string;
	crs: {
		type: string;
		properties: {
			name: string;
		}
	}
	features: [
		{
			type: string;
			properties: {
				[propertyName: string]: any;
			}
			geometry: {
				type: string;
				coordinates: Array<any>;
			}
		}
	]
}

export interface GeoJSONpropertySummary {
	propertyName: string;
	propertyType: string;
	propertyValues?: Array<string>;
	range?: {
		min: number;
		max: number;
	}
}

interface IMarkerCondition {
	property: string;
	value: any;
	color: string;
	size: number;
}
interface IPolygonCondition {
	property: string;
	value: any;
	fillColor: string;
}
interface IPolygonConfig {
	defaultFillColor: string;
	outlineColor: string;
	outlineWidth: number;
	conditions: Array<IPolygonCondition>;
	hatchConditions: Record<string, string|number|Array<string|number>>;
}

export type GeoJSONlegend = Array<{color: string; label: string;}>

export class GeoJsonLayer extends CesiumLayer<Cesium.GeoJsonDataSource> {

	private url?: string;
	private fileType: string;
	public data: object | undefined;
	public loaded: boolean = false;
	private layerControl!: CustomLayerControl;
	private availableProperties: Array<GeoJSONpropertySummary> = [];

	public defaultColorPoint: Cesium.Color = Cesium.Color.DODGERBLUE;
	public defaultColorLine: Cesium.ColorMaterialProperty = new Cesium.ColorMaterialProperty(Cesium.Color.GREEN);
	public defaultColorPolygon: Cesium.ColorMaterialProperty = new Cesium.ColorMaterialProperty(Cesium.Color.ORANGE);
	private colorUnselected: Cesium.ColorMaterialProperty = new Cesium.ColorMaterialProperty(Cesium.Color.LIGHTGREY);
	private defaultLineWidth: number = 3;
	private alpha: number = 0.6;

	public colorGradientStart: Cesium.Color = Cesium.Color.BLUE;
	public colorGradientEnd: Cesium.Color = Cesium.Color.RED;
	public style: Writable<string> = writable("default");
	public styleType: Writable<string> = writable();
	private styleUnsubscriber!: Unsubscriber;
	public legend: Writable<GeoJSONlegend> = writable();
	public maxLengthLegend: number = 50;

	private outlines: Cesium.CustomDataSource | undefined;
	private outlineColor: Cesium.Color = Cesium.Color.BLACK;
	private outlineWidth: number = 5;

	private markerConditions: Array<IMarkerCondition> = [];
	private polygonConditions: Array<IPolygonCondition> = [];
	private hatchConditions: Record<string, string|number|Array<string|number>> = {};

	public tools: Array<string>;
	public extrusionSliderMin: number;
	public extrusionSliderMax: number;
	public extrusionSliderStep: number;
	public extrusionSliderHeight: Writable<number> = writable(0);
	public extrusionSliderLabel: string;
	private extrusionUnsubscriber!: Unsubscriber;

	public clampToGround: boolean;

    constructor(map: Map, config: LayerConfig, data: object | undefined = undefined) {
        super(map, config);
		this.url = config.settings.url;
		this.parseConfig(config.settings);
		this.data = data;
		this.url = this.config.settings.url ?? undefined;
		this.fileType = this.config.type ?? "geojson";
        this.source = new Cesium.GeoJsonDataSource(this.config.id);
		config.transparent = true; // --> add opacity slider
		this.addControl();

		this.tools = this.config.settings.tools ? Object.keys(this.config.settings.tools) : [];

		this.extrusionSliderMin = this.config.settings.tools?.extrude?.slider_min ?? 0;
		this.extrusionSliderMax = this.config.settings.tools?.extrude?.slider_max ?? 10;
		this.extrusionSliderStep = this.config.settings.tools?.extrude?.slider_step ?? 1;
		this.extrusionSliderHeight.set(this.config.settings.tools?.extrude?.slider_default ?? 0);
		this.extrusionSliderLabel = this.config.settings.tools?.extrude?.slider_label ?? undefined;

		this.clampToGround = this.config.settings.clampToGround ?? true;
    }

	private parseConfig(settings: any): void {
		if (settings["theme"]) this.style.set(settings["theme"]);
		this.markerConditions = settings.markers;
		const polygonConfig = settings.polygons as IPolygonConfig;
		if (polygonConfig?.defaultFillColor) {
			this.defaultColorPolygon = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(polygonConfig.defaultFillColor));
		}
		if (polygonConfig?.outlineColor) {
			this.outlineColor = Cesium.Color.fromCssColorString(polygonConfig?.outlineColor);
		}
		this.polygonConditions = polygonConfig?.conditions || [];
		this.hatchConditions = polygonConfig?.hatchConditions || {};
	}

	public async addToMap(): Promise<void> {
		if (!this.loaded && (this.url || this.data)) await this.loadData();
		await this.map.viewer.dataSources.add(this.source);
		if (this.outlines) await this.map.viewer.dataSources.add(this.outlines);
		this.setAvailableProperties();
		this.styleUnsubscriber = this.style.subscribe((property: string) => {
			if (property && this.loaded) this.setStyle(property);
		});
		this.extrusionUnsubscriber = this.extrusionSliderHeight.subscribe((value: number) => {
			if (this.loaded && this.config.settings.tools?.extrude) this.setExtrusion(value);
		});
		get(this.visible) ? this.show() : this.hide();
		if (this.config.settings["dragDropped"]) this.zoomTo();
	}

	public removeFromMap(): void {
		this.removeControl();
		this.styleUnsubscriber();
		this.extrusionUnsubscriber();
		this.availableProperties = [];
		this.source.entities.removeAll();
		this.outlines?.entities.removeAll();
		this.map.viewer.dataSources.remove(this.source, true);
	}

	public show(): void {
        if (!this.loaded) return;
		this.source.show = true;
		if (this.outlines) this.outlines.show = true;
		this.map.refresh();
    }

    public hide(): void {
		if (!this.loaded) return;
		this.source.show = false;
		if (this.outlines) this.outlines.show = false;
        this.map.refresh();
    }

	private async loadData(): Promise<void> {
		if (this.loaded) return;
		this.loaded = true;
		
		let geojson: any;
		if(this.url) {
			if (this.fileType === "shapefile") {
				// geojson = await Shapefile.read(this.url);
				console.log("Shapefile not supported yet");
			} else {
				const request = await fetch(this.url);
				geojson = await request.json();
			}
		} else {
			geojson = this.data ?? "";
		}

		await this.source.load(geojson, {
			strokeWidth: this.defaultLineWidth,
			markerSymbol: "",
			clampToGround: true
		});

		if (!this.config.cameraPosition) this.setDefaultCameraPosition();

		const polygonConfig = this.config.settings.polygons as IPolygonConfig;
		if (polygonConfig?.outlineWidth) {
			const width = new Cesium.ConstantProperty(polygonConfig.outlineWidth);
			//this.addOutlines(width);
		}

		if (this.markerConditions) {
			this.replaceBillboards(this.markerConditions);
		}
	}

	private replaceBillboards(markerConditions: Array<IMarkerCondition>): void {
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			let size = 10;
			const entity = entities[i];
			if (!entity.properties || !entity.billboard) continue;
			const properties = entity.properties?.getValue(this.map.viewer.clock.currentTime);
			for (let j = 0; j < markerConditions.length; j++) {
				const markerCondition = markerConditions[j];
				if (markerCondition.property && markerCondition.value) {
					const prop = properties[markerCondition.property]?.toLowerCase?.() ?? properties[markerCondition.property];
					if (prop === markerCondition.value) {
						size = markerCondition.size;
						break;
					}
				}
			}
			entity.billboard = undefined;
			entity.point = new Cesium.PointGraphics({
				//color: --> set through this.setDefaultStyle()
				//outlineColor: --> set through this.updateOutlineOpacity(),
				pixelSize: size,
				heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			});
		}
	}

	private getMarkerColor(point: Cesium.Entity): Cesium.Color {
		const properties = point.properties?.getValue(this.map.viewer.clock.currentTime);
		for (let i = 0; i < this.markerConditions.length; i++) {
			const cond = this.markerConditions[i];
			const prop = properties[cond.property]?.toLowerCase?.() ?? properties[cond.property];
			if (prop === cond.value) {
				return Cesium.Color.fromCssColorString(cond.color);
			}
		}
		return this.defaultColorPoint;
	}

	private getPolygonColor(polygon: Cesium.Entity): Cesium.ColorMaterialProperty {
		const properties = polygon.properties?.getValue(this.map.viewer.clock.currentTime);
		for (let i = 0; i < this.polygonConditions.length; i++) {
			const cond = this.polygonConditions[i];
			const prop = properties[cond.property]?.toLowerCase?.() ?? properties[cond.property];
			if (prop === cond.value) {
				return new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(cond.fillColor).withAlpha(this.alpha));
			}
		}
		return this.defaultColorPolygon;
	}

	private setAvailableProperties(): void {
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			const properties = entity.properties?.getValue(this.map.viewer.clock.currentTime);
			for (const property in properties) {
				const propertyValue = properties[property];
				const propertyType = typeof propertyValue;
				const idx = this.availableProperties.findIndex(p => p.propertyName === property);

				if (propertyType === "string" && !isNaN(Number(propertyValue))) {
					const numericValue = Number(propertyValue);
					this.addNumberProperty(property, numericValue, idx);
				} else if (propertyType === "number") {
					this.addNumberProperty(property, propertyValue, idx);
				} else if (propertyType === "string") {
					this.addStringProperty(property, propertyValue, idx);
				}
			}
		}
		// Sort everything alphabetically:
		this.availableProperties.map(p => p.propertyValues?.sort());
		this.availableProperties.sort((a, b) => {
			let x = a.propertyName.toLowerCase();
			let y = b.propertyName.toLowerCase();
			if (x < y) return -1;
			if (x > y) return 1;
			return 0;
		});
	}

	private addNumberProperty(property: string, propertyValue: number, idx: number): void {
		if (idx < 0) {
			this.availableProperties.push({
				propertyName: property,
				propertyType: "number",
				range: {
					min: propertyValue,
					max: propertyValue
				}
			});
		} else {
			const range = this.availableProperties[idx].range;
			if (range) {
				if (propertyValue < range.min) {
					range.min = propertyValue;
				}
				if (propertyValue > range.max) {
					range.max = propertyValue;
				}
				this.availableProperties[idx].range = range;
			}
		}
	}

	private addStringProperty(property: string, propertyValue: string, idx: number): void {
		if (idx < 0) {
			this.availableProperties.push({
				propertyName: property,
				propertyValues: [propertyValue],
				propertyType: "string"
			});
		} else {
			if (!this.availableProperties[idx].propertyValues?.includes(propertyValue)) this.availableProperties[idx].propertyValues?.push(propertyValue);
		}
	}

	public setStyle(property: string, updateLegend: boolean = true): void {
		if (property === "default") {
			this.setDefaultStyle();
			this.styleType.set("default");
			return;
		};
		const prop = this.availableProperties.find(p => p.propertyName === property);
		if (!prop) return;
		if (prop.propertyType === "number") {
			const min = prop.range?.min;
			const max = prop.range?.max;
			if (min === undefined || max === undefined) return;
			this.setNumberStyle(prop, min, max);
			this.makeNumberLegend(min, max, 10);
			this.styleType.set("number");
		} else if (prop.propertyType === "string") {
			this.setStringStyle(prop, updateLegend);
			this.styleType.set("string");
		}
	}

	private setDefaultStyle(): void {
		const alpha = this.config.settings.polygons?.defaultFillColor === "transparent" ? 0.0 : this.alpha;
		this.defaultColorPolygon = new Cesium.ColorMaterialProperty(this.defaultColorPolygon.getValue(this.map.viewer.clock.currentTime).color.withAlpha(alpha));
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.point) {
				const color = this.getMarkerColor(entity);
				entity.point.color = new Cesium.ConstantProperty(color.withAlpha(1.0));
				//entity.point.outlineColor = new Cesium.ConstantProperty(Cesium.Color.BLACK.withAlpha(alpha));
			}
			else if (entity.polyline) entity.polyline.material = this.defaultColorLine;
			else if (entity.polygon) {
				const colorProp = entity.properties?.fill 
					? new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(entity.properties?.fill.getValue()).withAlpha(alpha))
					: this.getPolygonColor(entity);
				this.setPolygonMaterial(entity, colorProp);
			}
		}
		this.legend.set([]);
		this.map.refresh();
	}

	private setPolygonMaterial(polygonEntity: Cesium.Entity, colorProp: Cesium.ColorMaterialProperty): void {
		/*
		const polygonPositions = polygon.hierarchy?.getValue(this.map.viewer.clock.currentTime)?.positions;
		const polygonLatitudes = polygonPositions?.map((p: Cesium.Cartesian3) => Cesium.Cartographic.fromCartesian(p).latitude);
		const polygonHeight = Math.abs(Math.max(...polygonLatitudes) - Math.min(...polygonLatitudes)) * 360 / Math.PI * 111;
		*/
		if (!polygonEntity.polygon) return;
		const isHatched = Object.entries(this.hatchConditions).some(([key, value]) => {
			const propertyValue = polygonEntity.properties?.getValue(this.map.viewer.clock.currentTime)[key];
			return propertyValue === value || (Array.isArray(value) && value.includes(propertyValue));
		});
		let material: Cesium.ColorMaterialProperty | Cesium.StripeMaterialProperty = colorProp;
		if (isHatched) {
			material = new Cesium.StripeMaterialProperty({
				evenColor: colorProp.color,
				oddColor: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
				repeat: 40
			});
		}
		polygonEntity.polygon.material = material;
	}

	private setNumberStyle(property: GeoJSONpropertySummary, min: number, max: number): void {
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			let styledColor: Cesium.Color | undefined;
			const value = entity.properties?.getValue(this.map.viewer.clock.currentTime)[property.propertyName];
			if (typeof value === "number") {
				const color = new Cesium.Color;
				Cesium.Color.lerp(this.colorGradientStart, this.colorGradientEnd, (value - min) / (max - min), color);
				styledColor = color.withAlpha(this.alpha);
			}
			const newColor = styledColor ?? this.colorUnselected;
			//@ts-ignore
			if (entity.point) entity.point.color = newColor;
			else if (entity.polyline) entity.polyline.material = new Cesium.ColorMaterialProperty(newColor);
			else if (entity.polygon) this.setPolygonMaterial(entity, new Cesium.ColorMaterialProperty(newColor));
		}
		this.map.refresh();
	}

	private makeNumberLegend(min: number, max: number, steps: number = 10): void {
		/// if abs max value is lower than {steps}, then steps === Ceil(abs max value)
		const stepSize = (max - min) / steps;
		const decimals = stepSize < 0.1 ? 2 : stepSize < 1 ? 1 : 0;
		const decimalOperator = 10**decimals;
		const legend: GeoJSONlegend = [];
		for (let i = 0; i < steps; i++) {
			let stepColor = new Cesium.Color;
			Cesium.Color.lerp(this.colorGradientStart, this.colorGradientEnd, i * stepSize / (max - min), stepColor);
			const label = `${Math.round((min + (i * stepSize)) * decimalOperator)/decimalOperator} - ${Math.round((min + ((i + 1) * stepSize)) * decimalOperator)/decimalOperator}`;
			legend.push({color: stepColor.toCssColorString(), label: label});
		}
		this.legend.set(legend);
	}

	private setStringStyle(property: GeoJSONpropertySummary, updateLegend: boolean): GeoJSONlegend | undefined {
		// Make legend
		if (!property.propertyValues) return;
		if (updateLegend) {
			const legend: GeoJSONlegend = [];
			for (let i = 0; i < property.propertyValues.length; i++) {
				const color = Cesium.Color.fromRandom({alpha: 1.0});
				// Make sure color is not too bright:
				if (color.red + color.green + color.blue > 2.0) {
					color.red = color.red / 2;
					color.green = color.green / 2;
					color.blue = color.blue / 2;
				}
				legend.push({color: color.toCssColorString(), label: property.propertyValues[i]});
				if (i > this.maxLengthLegend - 2) break;
			}
			this.legend.set(legend);
		}
		// Color entities accoring to legend
		const legend = get(this.legend);
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			let styledColor: Cesium.Color | undefined;
			const value = entity.properties?.getValue(this.map.viewer.clock.currentTime)[property.propertyName];
			if (typeof value === "string") {
				const idx = property.propertyValues?.indexOf(value);
				if (idx > -1 && legend[idx]) {
					styledColor = Cesium.Color.fromCssColorString(legend[idx].color).withAlpha(this.alpha);
				}
			}
			const newColor = styledColor ?? this.colorUnselected;
			//@ts-ignore
			if (entity.point) entity.point.color = newColor;
			else if (entity.polyline) entity.polyline.material = new Cesium.ColorMaterialProperty(newColor);
			else if (entity.polygon) this.setPolygonMaterial(entity, new Cesium.ColorMaterialProperty(newColor));
		}
		// Update
		this.map.refresh();
	}


	private addOutlines(width: Cesium.ConstantProperty): void {
		this.outlines = new Cesium.CustomDataSource(this.config.id + "_outlines");
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.polygon) {
				const zIndex = new Cesium.ConstantProperty(i);
				entity.polygon.zIndex = zIndex;
				this.outlines.entities.add({
					polyline: {
						positions: entity.polygon.hierarchy?.getValue(this.map.viewer.clock.currentTime)?.positions,
						clampToGround: true,
						material: this.outlineColor,
						width: width,
						zIndex: zIndex
					}
				});

			}
		}
	}

	private updateOutlineOpacity(): void {
		if (!this.outlines) return;
		const newColor = new Cesium.ColorMaterialProperty(this.outlineColor.withAlpha(this.alpha));
		const entities = this.outlines.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.polyline) entity.polyline.material = newColor;
			if (entity.point) entity.point.color = new Cesium.ConstantProperty(this.outlineColor.withAlpha(this.alpha));
		}
	}


	private addControl(): void {
		this.layerControl = new CustomLayerControl();
		this.layerControl.component = LayerControlGeoJson;
		this.layerControl.props = {
			layer: this,
			properties: this.availableProperties
		};
		this.addCustomControl(this.layerControl);
	}

	private removeControl(): void {
		this.removeCustomControl(this.layerControl);
	}

	public opacityChanged(opacity: number): void {
		this.alpha = opacity / 100;
		if (this.source) {
			this.setStyle(get(this.style), false);
			this.updateOutlineOpacity();
			this.map.refresh();
		}
	}

	public getOpacity(opacity: number | undefined): number {
		if (opacity === undefined) return 1.0;
		opacity = opacity / 100;
		return opacity > 1 ? 1.0 : opacity < 0 ? 0 : opacity;
	}

	public zoomTo(): void {
		this.map.viewer.flyTo(this.source);
	}

	private setDefaultCameraPosition(): void {
		if (!this.source) return;
		const vertices: Array<number> = [];
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.point || entity.billboard) {
				const position = entity.position?.getValue(this.map.viewer.clock.currentTime);
				if (position) {
					vertices.push(position.x);
					vertices.push(position.y);
					vertices.push(position.z);
				}
			}
			if (entity.polyline) {
				const positions = entity.polyline.positions?.getValue(this.map.viewer.clock.currentTime);
				for (let j = 0; j < positions.length; j++) {
					vertices.push(positions[j].x);
					vertices.push(positions[j].y);
					vertices.push(positions[j].z);
				}
			} else if (entity.polygon) {
				const hierarchy = entity.polygon.hierarchy?.getValue(this.map.viewer.clock.currentTime);
				const positions = hierarchy.positions;
				for (let j = 0; j < positions.length; j++) {
					vertices.push(positions[j].x);
					vertices.push(positions[j].y);
					vertices.push(positions[j].z);
				}
			}
		}
		if (vertices.length === 0) return;
		const boundingSphere = Cesium.BoundingSphere.fromVertices(vertices, Cesium.Cartesian3.ZERO, 3);
		this.config.cameraPosition = getCameraPositionFromBoundingSphere(boundingSphere);
	}

	public setExtrusion(height: number): void {
		this.outlines?.entities.removeAll();
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.polygon) {
				// calculate mean height of entity
				const polygonPositions = entity.polygon.hierarchy?.getValue(this.map.viewer.clock.currentTime)?.positions;
				const polygonHeights = polygonPositions?.map((p: Cesium.Cartesian3) => Cesium.Cartographic.fromCartesian(p).height);
				const meanHeight = polygonHeights?.reduce((a: number, b: number) => a + b) / polygonHeights.length;

				entity.polygon.extrudedHeight = new Cesium.ConstantProperty(meanHeight + height);
				// polygon styling
				entity.polygon.outline = new Cesium.ConstantProperty(true);
				entity.polygon.outlineColor = new Cesium.ConstantProperty(this.outlineColor);
				entity.polygon.outlineWidth = new Cesium.ConstantProperty(this.outlineWidth);
			}
        }
		this.map.refresh();
	}
}