import { get, type Writable, type Unsubscriber, writable } from "svelte/store";
import * as Cesium from "cesium";

import type { Map } from "$lib/components/map-cesium/module/map";
import { CesiumIcon } from '$lib/components/map-cesium/module/cesium-icon';
import { CustomLayer } from "./custom-layer";

import breachIcon from "$lib/components/map-cesium/MapToolFlooding/icon-breach.svg";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { GeographicLocation } from "$lib/components/map-core/geographic-location";
import { getCartesian2 } from "$lib/components/map-cesium/module/utils/geo-utils";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";


export class IconLayer<F> extends CustomLayer {

	public hoveredFeature: Writable<F | undefined> = writable(undefined);
	public activeFeature: Writable<F | undefined> = writable(undefined);
	public mapIcons: Array<CesiumIcon<F>> = [];
	private boundingSphere: Cesium.BoundingSphere | undefined;
	private unsubscribers: Array<Unsubscriber> = new Array<Unsubscriber>();

	public colorProperties = {
		custom: new Cesium.ConstantProperty(Cesium.Color.LIGHTGRAY),
		active: new Cesium.ConstantProperty(Cesium.Color.LIGHTSKYBLUE),
	}

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.source = new Cesium.CustomDataSource(config.id);

		this.addListeners();
		this.addMouseEvents();
	}

	private addListeners() {
		this.unsubscribers.forEach((unsubscriber) => unsubscriber());
		this.unsubscribers.push(
			this.hoveredFeature.subscribe((feature) => {
				this.mapIcons.forEach((i) => i.hovered.set(i.feature === feature));
				this.map.refresh();
			}),
			this.activeFeature.subscribe((feature) => {
				this.mapIcons.forEach((i) => i.active.set(i.feature === feature));
				this.map.refresh();
				if (feature) this.flyToFeature(feature);
			}),
			this.map.options.use3DMode.subscribe((b) => {
				if (!this.source || !this.boundingSphere) return;
				this.config.cameraPosition = getCameraPositionFromBoundingSphere(this.boundingSphere, b);
			})
		);
	}

	set activeStore(value: Writable<F | undefined>) {
		this.activeFeature = value;
		this.addListeners();
	}

	public loadFeatures(items: Array<F>): void {
		// extract locations from GeoJSON features and create CesiumIcon objects
		const mapIcons: Array<CesiumIcon<F>> = [];
		items.map((feature: any) => {
			const location = new GeographicLocation(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
			const icon = new CesiumIcon(location, feature, breachIcon, this.colorProperties.custom, this.colorProperties.active, false);
			mapIcons.push(icon);
			return location;
		});
		this.addMapEntities(mapIcons);
		this.setCameraPosition();
		this.zoomToLayer();
	}


	public destroy() {
		this.unsubscribers.forEach((unsubscriber) => unsubscriber());
		this.clearMapEntities();
		this.removeMouseEvents();
	}

	private addMapEntities(newIcons: Array<CesiumIcon<F>>): void {
		this.mapIcons.push(...newIcons);
		newIcons.forEach((icon) => {
			this.source.entities.add(icon.billboard);
		});
	}

	private clearMapEntities(): void {
		this.source.entities.removeAll();
		this.mapIcons = [];
		this.removeMouseEvents();
	}

	private getObjectFromMouseLocation(m: any): F | undefined {
		const location = getCartesian2(m);
		if (!location) return undefined;
		const picked = this.map.viewer.scene.pick(location);
		if (picked?.id?.billboard !== undefined) {
			const billboard = picked.id.billboard as Cesium.BillboardGraphics;
			for (const icon of this.mapIcons) {
				if (billboard === icon.billboard.billboard) {
					return icon.feature;
				}
			}
			return undefined;
		}
	}

	private moveHandle = (m: any) => {
		const obj = this.getObjectFromMouseLocation(m);
		if (obj !== get(this.hoveredFeature)) this.hoveredFeature.set(obj);
		this.map.container.style.cursor = obj ? "pointer" : "default";
	}
	private leftClickHandle = (m: any) => {
		const obj = this.getObjectFromMouseLocation(m);
		if (obj !== get(this.activeFeature) && obj !== undefined) this.activeFeature.set(obj);
	}

	private addMouseEvents(): void {
		this.map.on("mouseLeftClick", this.leftClickHandle);
		this.map.on("mouseMove", this.moveHandle);
	}
	private removeMouseEvents(): void {
		this.map.off("mouseLeftClick", this.leftClickHandle);
		this.map.off("mouseMove", this.moveHandle);
	}

	public setCameraPosition(): void {
		const cartesians = this.mapIcons.map(i => i.billboard.position?.getValue()).filter(c => c !== undefined);
		this.boundingSphere = Cesium.BoundingSphere.fromPoints(cartesians);
		this.config.cameraPosition = getCameraPositionFromBoundingSphere(this.boundingSphere);
	}

	public show(): void {
		this.mapIcons?.forEach((icon) => icon.show.set(true));
		this.map?.refresh();
	}

	public hide(): void {
		this.mapIcons?.forEach((icon) => icon.show.set(false));
		this.map?.refresh();
	}

	public zoomToLayer(): void {
		this.map.flyTo(this.config.cameraPosition);
	}

	public flyToFeature(feature: F): void {
		const icon = this.mapIcons.find((i) => i.feature === feature);
		if (!icon) return;
		let pitch = get(this.map.options.use3DMode) ? -60 : -89.9;
		this.map.viewer.flyTo(icon.billboard, {
			duration: 1,
			offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(pitch), 5000)
		});
	}
}
