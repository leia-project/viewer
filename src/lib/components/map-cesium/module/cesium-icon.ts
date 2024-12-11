import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import * as Cesium from "cesium";

import type { Map } from "$lib/components/map-cesium/module/map";
import type { GeographicLocation } from "$lib/components/map-core/geographic-location";


export class CesiumIcon {
	private map: Map;
	public location: GeographicLocation;
	public properties: object;
	public billboard!: Cesium.Entity;

	private icon: string;
	public iconHeight: number = 0;
	private color: Cesium.ConstantProperty;
	private activeColor: Cesium.ConstantProperty;

	public active: Writable<boolean>;
	public hovered: Writable<boolean>;
	public show: Writable<boolean>;
	public ready: Writable<boolean> = writable(false);

	private hoveredUnsubscriber!: Unsubscriber;
	private activeUnsubscriber!: Unsubscriber;
	private locationUnsubscriber!: Unsubscriber;
	private activeGeometryUnsubscriber!: Unsubscriber;
	private showUnsubscriber!: Unsubscriber;

	constructor(
		map: Map,
		location: GeographicLocation,
		properties: object,
		icon: string,
		color: Cesium.ConstantProperty,
		activeColor: Cesium.ConstantProperty,
		show: boolean
	) {
		this.map = map;
		this.location = location;
		this.properties = properties;
		this.icon = icon;
		this.color = color;
		this.activeColor = activeColor;
		this.hovered = writable(false);
		this.active = writable(false);
		this.show = writable(show);

		this.addBilboard();

		this.hoveredUnsubscriber = this.hovered.subscribe((hovered) => {
			if (this.billboard.billboard) {
				this.billboard.billboard.color = get(this.hovered) || get(this.active) ? this.activeColor : this.color;
			}
		});

		this.activeUnsubscriber = this.active.subscribe((active) => {
			if (this.billboard.billboard) {
				this.billboard.billboard.color = active ? this.activeColor : this.color;
			}
		});

		this.showUnsubscriber = this.show.subscribe((show) => {
			if (this.billboard) this.billboard.show = show;
		});
	}

	onDestroy(): void {
		this.removeItem();
	}

	public removeItem(): void {
		this.map.viewer.entities.remove(this.billboard);
		this.hoveredUnsubscriber();
		this.activeUnsubscriber();
		this.showUnsubscriber();
	}

	private addBilboard(): void {
		const nearFarScalar = new Cesium.NearFarScalar(150, 1.0, 1.5e5, 0.3);
		const { lon, lat } = this.location;
		const cartesian3 = Cesium.Cartesian3.fromDegrees(lon, lat);
		const magnitude = Cesium.Cartesian3.magnitude(cartesian3);
		// Add height offset (meters) to the icon
		Cesium.Cartesian3.multiplyByScalar(
			cartesian3,
			(magnitude + this.iconHeight) / magnitude,
			cartesian3
		); 
		this.billboard = new Cesium.Entity({
			position: cartesian3,
			billboard: {
				image: this.icon,
				color: this.color,
				pixelOffset: new Cesium.Cartesian2(0, -22),
				pixelOffsetScaleByDistance: nearFarScalar,
				scaleByDistance: nearFarScalar,
				heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
			}
		});
		this.map.viewer.entities.add(this.billboard);
	}
}
