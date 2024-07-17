import type { Map } from "./map";
import * as Cesium from "cesium";
import { FeatureInfo } from "$lib/components/map-core/FeatureInfo/feature-info";
import { FeatureInfoRequestOptions } from "$lib/components/map-core/FeatureInfo/feature-info-request-options";
import { FeatureInfoRecord } from "$lib/components/map-core/FeatureInfo/feature-info-record";
import { get } from "svelte/store";


export class FeatureInfoHandler {
    public readonly selectedProperty: string = "cesium_selected";
    public selected3DTileFeature : Cesium.Cesium3DTileFeature | undefined;

    private selected: Cesium.Entity | undefined;
    private scratchColor!: Cesium.MaterialProperty;

    private map: Map;

    constructor(map: Map) {
        this.map = map;
        this.map.featureInfo.results.subscribe(results => {
            if(!results || results.length === 0) {
                this.resetSelected3DTileFeature();
            }
        })
    }

    public async queryFeatureInfo(options: FeatureInfoRequestOptions): Promise<FeatureInfo[]> {
        this.resetSelected3DTileFeature();
        this.resetSelectedEntity();

        const fiList = new Array<FeatureInfo>()

        const location = new Cesium.Cartesian2(options.location[0], options.location[1]);
        const picked = this.map.viewer.scene.pick(location);
        let info: FeatureInfo | undefined = undefined;

        // First check if primitive is clicked
        if (Cesium.defined(picked)) {
            info = this.pick3D(picked);
        }

        // Nothing found, request imagery layers
        if (info === undefined && Cesium.defined(this.map.viewer.scene.globe)) {
            info = await this.pickImageryLayers(location);
        }

        if (info) {
            fiList.push(info);
        }

        return fiList;
    }

    private highlight3DTileFeature(feature: Cesium.Cesium3DTileFeature): void {   
        this.selected3DTileFeature = feature;
        this.selected3DTileFeature.setProperty(this.selectedProperty, "true");
        
        this.map.refresh();
    }

    private resetSelected3DTileFeature(): void {
        if(this.selected3DTileFeature) {
            this.selected3DTileFeature.setProperty(this.selectedProperty, "false");
            this.selected3DTileFeature = undefined;            
            this.map.refresh();
        }
    }

    private highlightEntity(entity: Cesium.Entity): void {
        // Only support for ellipse and cylinder
        const entityGraphics = entity.ellipse ?? entity.cylinder;
        if (!entityGraphics || !entityGraphics.material) return;
        this.selected = entity;
        this.scratchColor = entityGraphics.material;
        entityGraphics.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(get(this.map.featureInfo.selectedFeatureColor)).withAlpha(0.85));
        this.map.refresh();
    }

    private resetSelectedEntity(): void {
        const selectedEntity = this.selected?.ellipse ?? this.selected?.cylinder;
        if (selectedEntity) {
            selectedEntity.material = this.scratchColor;
            this.selected = undefined;
            this.map.refresh();
        }
    }

    private pick3D(picked: any): FeatureInfo | undefined {
        const id = Cesium.defaultValue(picked.id, picked.primitive.id);
        
        if (id instanceof Cesium.Entity) {
            this.highlightEntity(id); //Implement this?
            return this.cesiumEntityGetFeatureInfo(id);
        }

        if (picked instanceof Cesium.Cesium3DTileFeature) {     
            this.highlight3DTileFeature(picked);
            return this.cesium3dTileFeatureToFeatureInfo(picked);
        }

        return undefined;
    }

    private cesiumEntityGetFeatureInfo(entity: Cesium.Entity): FeatureInfo | undefined {
        const records = new Array<FeatureInfoRecord>();
        if (entity.properties) {
            const props = entity.properties;
            const propNames = props.propertyNames;
            for (let x = 0; x < propNames.length; x++) {
                records.push(new FeatureInfoRecord(propNames[x], props[propNames[x]]));
            }
            return new FeatureInfo(entity.name ?? "", records);
        } else {
            return undefined;
        }
    }

    private cesium3dTileFeatureToFeatureInfo(feature: Cesium.Cesium3DTileFeature): FeatureInfo {
        const records = new Array<FeatureInfoRecord>();
        const propertyNames = feature.getPropertyIds();
        const length = propertyNames.length;

        for (let i = 0; i < length; ++i) {
            const propertyName = propertyNames[i];
            let property = feature.getProperty(propertyName);
            if (!property) {
                property = "empty";
            }

            property = property.toString();

            // Filter out our selected property for styling
            if(propertyNames[i] === this.selectedProperty) {
                continue;
            }
            if (property.startsWith("url:")) {
                property = property.replace("url:", "");
                const parts = property.split(",");
                records.push(
                    new FeatureInfoRecord(
                        propertyNames[i],
                        `<a class="link" href="${parts[0]}" target="_blank">${parts[1]}</a>`
                    )
                );
            } else {
                records.push(new FeatureInfoRecord(propertyNames[i], property));
            }
        }

        let title = this.getCesium3DTileFeatureName(feature);

        const tiltesetTitle = feature.tileset["title"];
        if (tiltesetTitle) {
            title = tiltesetTitle;
        } else {
            const configId = feature.tileset["config_id"];
            if (configId) {
                title = this.getLayerName(configId);
            }
        }

        return new FeatureInfo(title, records);
    }

    private async pickImageryLayers(position: Cesium.Cartesian2): Promise<FeatureInfo | undefined> {
        const pickRay = this.map.viewer.scene.camera.getPickRay(position);
        if (!pickRay) return undefined;
        const features = await this.map.viewer.scene.imageryLayers.pickImageryLayerFeatures(pickRay, this.map.viewer.scene);
        if (!features || features.length === 0) return undefined;
        return this.imageryFeaturesToFeatureInfo(features);
    }

    private imageryFeaturesToFeatureInfo(features: Array<Cesium.ImageryLayerFeatureInfo>): FeatureInfo | undefined {
        if (!features || features.length === 0) {
            return undefined;
        }

        const feature = features[0];
        const properties = feature.properties;
        const records = new Array<FeatureInfoRecord>();

        if (properties) {
            const keys = Object.keys(properties);
            keys.forEach((key) => {
                records.push(new FeatureInfoRecord(key, properties[key]));
            });
        }

        let title = feature.name;
        const configId = feature.imageryLayer["config_id"];
        if (configId) {
            title = this.getLayerName(configId);
        }

        return new FeatureInfo(title ? title : "-", records);
    }

    private getCesium3DTileFeatureName(feature: Cesium.Cesium3DTileFeature) {
        // We need to iterate all property names to find potential
        // candidates, but since we prefer some property names
        // over others, we store them in an indexed array
        // and then use the first defined element in the array
        // as the preferred choice.

        let i;
        const possibleNames = [];
        const propertyNames = feature.getPropertyIds();
        for (i = 0; i < propertyNames.length; i++) {
            const propertyName = propertyNames[i];
            if (/^name$/i.test(propertyName)) {
                possibleNames[0] = feature.getProperty(propertyName);
            } else if (/name/i.test(propertyName)) {
                possibleNames[1] = feature.getProperty(propertyName);
            } else if (/^title$/i.test(propertyName)) {
                possibleNames[2] = feature.getProperty(propertyName);
            } else if (/^(id|identifier)$/i.test(propertyName)) {
                possibleNames[3] = feature.getProperty(propertyName);
            } else if (/element/i.test(propertyName)) {
                possibleNames[4] = feature.getProperty(propertyName);
            } else if (/(id|identifier)$/i.test(propertyName)) {
                possibleNames[5] = feature.getProperty(propertyName);
            }
        }

        const length = possibleNames.length;
        for (i = 0; i < length; i++) {
            const item = possibleNames[i];
            if (Cesium.defined(item) && item !== "") {
                return item;
            }
        }

        if (feature.tileset?.config_id) {
            const layerName = this.getLayerName(feature.tileset.config_id);
            if (layerName) {
                return layerName;
            }
        }

        return "Feature Info";
    }

    private getLayerName(configId: string): string {
        const layer = this.map.getLayerById(configId);
        return layer.title ?? "";
    }
}
