// Re-export external dependencies for easier syncing between repositories

export { Dispatcher } from "$lib/components/map-core/event/dispatcher";
export { NotificationType } from "$lib/components/map-core/notifications/notification-type";
export { notifications } from "$lib/components/map-core/notifications/notifications";
export { Notification } from "$lib/components/map-core/notifications/notification";
export type { Map } from "$lib/components/map-cesium/module/map";
export type { LayerConfig } from "$lib/components/map-core/layer-config";
export { selectedLanguage } from "$lib/components/localization/localization";
export { CameraLocation } from "$lib/components/map-core/camera-location";
export type { MouseLocation } from "$lib/components/map-core/mouse-location";
export type { GeoJSONFeature } from "$lib/components/map-cesium/module/providers/ogc-features-provider";
export { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";

export { default as MarvinAvatar } from "$lib/components/map-cesium/MapToolFlooding/Marvin/components/MarvinAvatar.svelte";
export { QA } from "$lib/components/map-cesium/MapToolFlooding/Marvin/module/qa";
export { DrawnGeometry } from "$lib/components/map-cesium/MapToolFlooding/Marvin/module/draw/drawn-geometry";