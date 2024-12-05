import { get, type Writable, type Unsubscriber, writable } from "svelte/store";
import * as Cesium from "cesium";

import type { Map } from "$lib/components/map-cesium/module/map";
import { CesiumIcon } from '$lib/components/map-cesium/module/cesium-icon';
import { CustomLayer } from "./custom-layer";

import depotIcon from "$lib/components/map-cesium/MapToolFlooding/icon-breach.svg";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { GeographicLocation } from "$lib/components/map-core/geographic-location";
import { getCartesian2 } from "$lib/components/map-cesium/module/utils/geo-utils";
import { getCameraPositionFromBoundingSphere } from "../utils/layer-utils";


export class IconLayer extends CustomLayer {

    public hoveredIcon: Writable<CesiumIcon | undefined> = writable(undefined);
    public activeIcon: Writable<CesiumIcon | undefined> = writable(undefined);
    public loaded: boolean = false;
    public MapIcons: Array<CesiumIcon> = new Array<CesiumIcon>();
    private unsubscribers: Array<Unsubscriber> = new Array<Unsubscriber>();

    public colorProperties = {
        custom: new Cesium.ConstantProperty(Cesium.Color.LIGHTGRAY),
        active: new Cesium.ConstantProperty(Cesium.Color.LIGHTSKYBLUE),
    }

    constructor(map: Map, config: LayerConfig) {
		super(map, config);

		this.loaded = false;
		this.addListeners();
        this.addMouseEvents();
	}

    private addListeners() {
        this.unsubscribers.push(
            this.hoveredIcon.subscribe((icon) => {
                this.MapIcons.forEach((i) => i.hovered.set(i === icon));
                this.map.refresh();
            }),
            this.activeIcon.subscribe((icon) => {
                this.MapIcons.forEach((i) => i.active.set(i === icon));
                this.map.refresh();
            })
        );
    }

    private async loadData() {
        await fetch(this.config.settings["url"])
            .then(response => response.json())
            .then(data => {
                // extract locations from GeoJSON features and create CesiumIcon objects
                data.features.map((feature: any) => {
                    const location = new GeographicLocation(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
                    const icon = new CesiumIcon(this.map, location, depotIcon, this.colorProperties.custom, this.colorProperties.active, true);
                    this.MapIcons.push(icon);
                    return location;
                });
                this.setCameraPosition();
                this.loaded = true;
            })
    }


    public destroy() {
        this.unsubscribers.forEach((unsubscriber) => unsubscriber());
        this.clearMapEntities();
		this.removeMouseEvents();
    }

    private clearMapEntities(): void {
        this.MapIcons.forEach((item) => item.removeItem());
        this.MapIcons = new Array();
        this.removeMouseEvents();
    }

    private getObjectFromMouseLocation(m: any): CesiumIcon | undefined {
        const location = getCartesian2(m);
        if (!location) return undefined;
        const picked = this.map.viewer.scene.pick(location);
        if (picked?.id?.billboard !== undefined) {
            const billboard = picked.id.billboard as Cesium.BillboardGraphics;
            for (const icon of this.MapIcons) {
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
        if (obj !== get(this.activeIcon)) this.activeIcon.set(obj);
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
		const cartesians = this.MapIcons.map(i => i.billboard.position?.getValue()).filter(c => c !== undefined);
		const sphere = Cesium.BoundingSphere.fromPoints(cartesians);
        this.config.cameraPosition = getCameraPositionFromBoundingSphere(sphere);
	}

    public show(): void {
		if (!this.loaded) {
			this.loadData();
		} else {
            this.MapIcons.forEach((icon) => icon.show.set(true));
        }
	}

	public hide(): void {
		this.MapIcons.forEach((icon) => icon.show.set(false));
	}
}
