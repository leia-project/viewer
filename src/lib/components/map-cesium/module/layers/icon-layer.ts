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


export class IconLayer extends CustomLayer {

    public hoveredIcon: Writable<CesiumIcon | undefined> = writable(undefined);
    public activeIcon: Writable<CesiumIcon | undefined> = writable(undefined);
    public loaded: Writable<boolean> = writable(false);
    public mapIcons: Writable<Array<CesiumIcon>> = writable(new Array<CesiumIcon>());
    private unsubscribers: Array<Unsubscriber> = new Array<Unsubscriber>();

    public colorProperties = {
        custom: new Cesium.ConstantProperty(Cesium.Color.LIGHTGRAY),
        active: new Cesium.ConstantProperty(Cesium.Color.LIGHTSKYBLUE),
    }

    constructor(map: Map, config: LayerConfig) {
		super(map, config);

		this.addListeners();
        this.addMouseEvents();
        this.loadData();
	}

    private addListeners() {
        this.unsubscribers.push(
            this.hoveredIcon.subscribe((icon) => {
                get(this.mapIcons).forEach((i) => i.hovered.set(i === icon));
                this.map.refresh();
            }),
            this.activeIcon.subscribe((icon) => {
                get(this.mapIcons).forEach((i) => i.active.set(i === icon));
                this.map.refresh();
            })
        );
    }

    private async loadData() {
        await fetch(this.config.settings["url"])
            .then(response => response.json())
            .then(data => {
                // extract locations from GeoJSON features and create CesiumIcon objects
                let mapIcons: Array<CesiumIcon> = [];
                data.features.map((feature: any) => {
                    const location = new GeographicLocation(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
                    const properties = feature.properties;
                    const icon = new CesiumIcon(this.map, location, properties, breachIcon, this.colorProperties.custom, this.colorProperties.active, false);
                    mapIcons.push(icon);
                    return location;
                });
                this.mapIcons.set(mapIcons);
                this.setCameraPosition();
                this.loaded.set(true);
            })
    }


    public destroy() {
        this.unsubscribers.forEach((unsubscriber) => unsubscriber());
        this.clearMapEntities();
		this.removeMouseEvents();
    }

    private clearMapEntities(): void {
        get(this.mapIcons).forEach((item) => item.removeItem());
        this.mapIcons.set(new Array());
        this.removeMouseEvents();
    }

    private getObjectFromMouseLocation(m: any): CesiumIcon | undefined {
        const location = getCartesian2(m);
        if (!location) return undefined;
        const picked = this.map.viewer.scene.pick(location);
        if (picked?.id?.billboard !== undefined) {
            const billboard = picked.id.billboard as Cesium.BillboardGraphics;
            for (const icon of get(this.mapIcons)) {
                if (billboard === icon.billboard.billboard) {
                    return icon;
                }
            }
            return undefined;
        }
    }

    private moveHandle = (m: any) => {
        const obj = this.getObjectFromMouseLocation(m);
        if (obj !== get(this.hoveredIcon)) this.hoveredIcon.set(obj);
        this.map.container.style.cursor = obj ? "pointer" : "default";
    }
    private leftClickHandle = (m: any) => {
        const obj = this.getObjectFromMouseLocation(m);
        if (obj !== get(this.activeIcon) && obj !== undefined) this.activeIcon.set(obj);
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
		const cartesians = get(this.mapIcons).map(i => i.billboard.position?.getValue()).filter(c => c !== undefined);
		const sphere = Cesium.BoundingSphere.fromPoints(cartesians);
        this.config.cameraPosition = getCameraPositionFromBoundingSphere(sphere);
	}

    public show(): void {
        if (get(this.loaded)) get(this.mapIcons).forEach((icon) => icon.show.set(true));
	}

	public hide(): void {
		if (get(this.loaded)) get(this.mapIcons).forEach((icon) => icon.show.set(false));
	}
}
