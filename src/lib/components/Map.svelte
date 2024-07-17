<script lang="ts">
	import { app } from '$lib/app/app';
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import MapCesium from "$lib/components/map-cesium/MapCesium.svelte";
	import { notifications } from "$lib/components/map-core/notifications/notifications.js";
	import { Notification } from "$lib/components/map-core/notifications/notification.js";
	import { NotificationType } from "$lib/components/map-core/notifications/notification-type.js";
	import { onDestroy } from 'svelte';

	$: map = get(app.map);

	const unsubscribe = app.map.subscribe((map) => {
		if (map) {
			map.ready.subscribe((ready) => {
				const configSettings = get(app.configSettings)
				if (ready && map.configured !== true) {
					if (configSettings.configUrl !== "") {
						map.setConfig(configSettings.configUrl);
					} else {
						const notification = new Notification(NotificationType.ERROR, "Error", $_("general.notifications.noConfigText"), 15000, true, true);
						notifications.send(notification);
					}
				}
			});
		}
	})

	onDestroy(() => {
		unsubscribe();})
</script>

<MapCesium {map} />
