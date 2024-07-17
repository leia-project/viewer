<script lang="ts">
    import { ToastNotification } from "carbon-components-svelte";
    import { notifications } from "$lib/components/map-core/notifications/notifications";
    import type { Notification } from "$lib/components/map-core/notifications/notification";
    import { NotificationType } from "$lib/components/map-core/notifications/notification-type";

    notifications.on("notificationAdded", (n: any) => {
        addNotification(n);
    });

    let holder: HTMLElement;

    function notificationTypeToKind(type: NotificationType): unknown {
        switch (type) {
            case NotificationType.INFO:
                return "info";
            case NotificationType.SUCCESS:
                return "success";
            case NotificationType.DEBUG:
                return "info";
            case NotificationType.WARN:
                return "warning";
            case NotificationType.ERROR:
                return "error";
        }

        return "info";
    }

    function addNotification(notification: Notification): void {
        new ToastNotification({
            target: holder,
            props: {
                fullWidth: true,
                // @ts-ignore
                kind: notificationTypeToKind(notification.type),
                title: notification.title,
                subtitle: notification.message,
                caption: notification.showDate ? new Date().toLocaleString() : undefined,
                timeout: notification.timeout
            }
        });
    }
</script>

<div class="notification-wrapper">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        bind:this={holder}
        class="notification"
        on:click={(e) => {
            e.preventDefault(), e.stopImmediatePropagation();
        }}
        role="button"
        tabindex="0"
    />
</div>

<style>
    .notification-wrapper {
        z-index: 9999;
        width: 450px;
        position: absolute;
        bottom: var(--cds-spacing-05);
        margin-left: auto;
        margin-right: auto;
        left: 0;
        right: 0;
        text-align: center;
    }

    .notification {
        text-align: left;
    }
</style>
