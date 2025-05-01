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

export type GeoJSONlegend = Array<{color: string; label: string;}>

export class GeoJsonLayer extends CesiumLayer<Cesium.GeoJsonDataSource> {

	private url: string;
	private fileType: string;
	public data: object | undefined;
	public loaded: boolean = false;
	private layerControl!: CustomLayerControl;
	private availableProperties: Array<GeoJSONpropertySummary> = [];
	private hatchConditions: {[key: string]: string|number|Array<string|number>};

	private defaultColorPoint: Cesium.Color = Cesium.Color.BLUE;
	private defaultColorLine: Cesium.ColorMaterialProperty = new Cesium.ColorMaterialProperty(Cesium.Color.GREEN);
	public defaultColorPolygon: Cesium.ColorMaterialProperty = new Cesium.ColorMaterialProperty(Cesium.Color.ORANGE);
	private colorUnselected: Cesium.ColorMaterialProperty = new Cesium.ColorMaterialProperty(Cesium.Color.LIGHTGREY);
	private defaultLineWidth: number = 3;
	private alpha: number = 1.0;

	public colorGradientStart: Cesium.Color = Cesium.Color.BLUE;
	public colorGradientEnd: Cesium.Color = Cesium.Color.RED;
	public style: Writable<string> = writable("default");
	public styleType: Writable<string> = writable();
	private styleUnsubscriber: Unsubscriber = this.style.subscribe((property: string) => {
		if (property && this.loaded) this.setStyle(property);
	});
	public legend: Writable<GeoJSONlegend> = writable();
	public maxLengthLegend: number = 50;
	
	public extrusionSliderMin: number;
	public extrusionSliderMax: number;
	public extrusionSliderStep: number;
	public extrusionSliderHeight: Writable<number> = writable(0);
	public extrusionSliderLabel: string;
	private extrusionUnsubscriber!: Unsubscriber;

	public clampToGround: boolean;

	public tools: Array<string>;


	private outlines: Cesium.CustomDataSource | undefined;
	private outlineColor: Cesium.Color = Cesium.Color.BLACK;
	private outlineWidth: number = 5;

    constructor(map: Map, config: LayerConfig, data: object | undefined = undefined) {
        super(map, config);
		this.data = data;
		this.url = this.config.settings.url ?? undefined;
		this.fileType = this.config.type ?? "geojson";
        this.source = new Cesium.GeoJsonDataSource(this.config.id);
		if (this.config.settings["style"] && typeof this.config.settings["style"] === "string") {
			this.style.set(this.config.settings["style"])
		} else if (typeof this.config.settings["style"] === "object") {
			this.style.set("custom");
		}
		this.hatchConditions = this.config.settings.hatchConditions ?? {};
		config.transparent = true; // --> add opacity slider
		this.addControl();

		// check what tools should be included in the layer manager based on config.json
		this.tools = this.config.settings.tools ? Object.keys(this.config.settings.tools) : [];

		this.extrusionSliderMin = this.config.settings.tools?.extrude?.slider_min ?? 0;
		this.extrusionSliderMax = this.config.settings.tools?.extrude?.slider_max ?? 10;
		this.extrusionSliderStep = this.config.settings.tools?.extrude?.slider_step ?? 1;
		this.extrusionSliderHeight.set(this.config.settings.tools?.extrude?.slider_default ?? 0);
		this.extrusionSliderLabel = this.config.settings.tools?.extrude?.slider_label ?? undefined;

		this.clampToGround = this.config.settings.clampToGround ?? true;
    }

	public async addToMap(): Promise<void> {
		if (!this.loaded && (this.url || this.data)) await this.loadData();
		await this.map.viewer.dataSources.add(this.source);
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
			fill: this.config.settings.style?.fill ? Cesium.Color.fromCssColorString(this.config.settings.style.fill) : undefined,
			markerSymbol: '',
			clampToGround: this.clampToGround
		});

		if (!this.config.cameraPosition) this.setDefaultCameraPosition();

		// workaround for outlines, which Cesium does not render correctly
		if (this.config.settings.style?.stroke) {
			if (this.config.settings.style?.strokeWidth) this.outlineWidth = this.config.settings.style.stroke ?? this.defaultLineWidth;
			if (this.config.settings.style?.stroke) this.outlineColor = Cesium.Color.fromCssColorString(this.config.settings.style.stroke);
			this.addOutlines();
		}
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

				if (propertyType === "number") {
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

	public setStyle(property: string): void {
		this.defaultColorPolygon = new Cesium.ColorMaterialProperty(this.defaultColorPolygon.getValue(this.map.viewer.clock.currentTime).color.withAlpha(this.alpha));
		if (property === "default") {
			this.setDefaultStyle(); 
			this.legend.set([]);
			return;
		}
		if (property === "custom") {
			this.setCustomStyle();
			this.legend.set([]);
			return;
		}
		const prop = this.availableProperties.find(p => p.propertyName === property);
		if (!prop) return;
		if (prop.propertyType === "number") {
			const min = prop.range?.min;
			const max = prop.range?.max;
			if (!min || !max) return;
			this.setNumberStyle(prop, min, max);
			this.makeNumberLegend(min, max, 10);
			this.styleType.set("number");
		} else if (prop.propertyType === "string") {
			this.setStringStyle(prop);
			this.styleType.set("string");
		}
	}

	private setDefaultStyle(): void {
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.point) entity.point.color = new Cesium.ColorMaterialProperty(this.defaultColorPoint.withAlpha(this.alpha));
			else if (entity.polyline) entity.polyline.material = this.defaultColorLine;
			else if (entity.polygon) {
				const colorProp = entity.properties?.fill 
					? new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(entity.properties?.fill.getValue()).withAlpha(this.alpha))
					: this.defaultColorPolygon;
				this.setPolygonMaterial(entity, colorProp);
			}
		}
		this.map.refresh();
	}

	private setCustomStyle(): void {
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.point) entity.point.color = new Cesium.ColorMaterialProperty(this.defaultColorPoint.withAlpha(this.alpha));
			else if (entity.polyline) entity.polyline.material = this.defaultColorLine;
			else if (entity.polygon) {
				const colorProp = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(this.config.settings.style.fill).withAlpha(this.alpha))
				this.setPolygonMaterial(entity, colorProp);
			}
		}
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
		let material: Cesium.MaterialProperty = colorProp;
		if (isHatched) {
			material = new Cesium.StripeMaterialProperty({
				evenColor: colorProp.color,
				oddColor: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
				repeat: 40
			});
		}
		polygonEntity.polygon.material = material;
		polygonEntity.polygon.perPositionHeight = new Cesium.ConstantProperty(true);
	}

	private setNumberStyle(property: GeoJSONpropertySummary, min: number, max: number): void {
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			let styledColor: Cesium.ColorMaterialProperty | undefined;
			const value = entity.properties?.getValue(this.map.viewer.clock.currentTime)[property.propertyName];
			if (typeof value === "number") {
				const color = new Cesium.Color;
				Cesium.Color.lerp(this.colorGradientStart, this.colorGradientEnd, (value - min) / (max - min), color);
				styledColor = new Cesium.ColorMaterialProperty(color.withAlpha(this.alpha));
			}
			const newColor = styledColor ?? this.colorUnselected;
			if (entity.point) entity.point.color = newColor;
			else if (entity.polyline) entity.polyline.material = newColor;
			else if (entity.polygon) this.setPolygonMaterial(entity, newColor);
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

	private setStringStyle(property: GeoJSONpropertySummary): GeoJSONlegend | undefined {
		// Make legend
		if (!property.propertyValues) return;
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
		// Color entities accoring to legend
		const entities = this.source.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			let styledColor: Cesium.ColorMaterialProperty | undefined;
			const value = entity.properties?.getValue(this.map.viewer.clock.currentTime)[property.propertyName];
			if (typeof value === "string") {
				const idx = property.propertyValues?.indexOf(value);
				if (idx > -1 && legend[idx]) {
					styledColor = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(legend[idx].color));
				}
			}
			const newColor = styledColor ?? this.colorUnselected;
			if (entity.point) entity.point.color = newColor;
			else if (entity.polyline) entity.polyline.material = newColor;
			else if (entity.polygon) this.setPolygonMaterial(entity, newColor);
		}
		// Update
		this.legend.set(legend);
		this.map.refresh();
	}


	private addOutlines(): void {
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
						clampToGround: this.clampToGround,
						material: this.outlineColor,
						width: new Cesium.ConstantProperty(this.outlineWidth),
						zIndex: zIndex
					}
				});

			}
		}
		this.map.viewer.dataSources.add(this.outlines);
	}

	private updateOutlineOpacity(): void {
		if (!this.outlines) return;
		const newColor = new Cesium.ColorMaterialProperty(this.outlineColor.withAlpha(this.alpha));
		const entities = this.outlines.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.polyline) entity.polyline.material = newColor;
		}
	}


	private addControl(): void {
		this.layerControl = new CustomLayerControl();
		this.layerControl.component = LayerControlGeoJson;
		this.layerControl.props = {
			layer: this,
			properties: this.availableProperties,
			defaultStyle: get(this.style) === "custom" ? "custom" : "default" 
		};
		this.addCustomControl(this.layerControl);
	}

	private removeControl(): void {
		this.removeCustomControl(this.layerControl);
	}

	public opacityChanged(opacity: number): void {
		this.alpha = opacity / 100;
		if (this.source) {
			this.setStyle(get(this.style));
			this.updateOutlineOpacity();
			this.map.refresh();
		}
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