
import { Dispatcher } from "../event/dispatcher";
import { Notification } from "./notification";
import { NotificationType } from "./notification-type";

class Notifications extends Dispatcher {
    constructor() {
        super();
    }

    public send(notification: Notification): void {
        this.dispatch("notificationAdded", notification);   

        if(notification.logToConsole) {
            this.logToConsole(notification);
        }
    }

    private logToConsole(notification: Notification): void {
        switch(notification.type) {
            case NotificationType.DEBUG:
                console.debug(notification.title, notification.message);
            case NotificationType.INFO:
                console.info(notification.title, notification.message);
            case NotificationType.WARN:
                console.warn(notification.title, notification.message);
            case NotificationType.ERROR:
                console.error(notification.title, notification.message);
            default:
                console.info(notification.title, notification.message);
        }

        if(notification.error) {
            console.error(notification.error);            
        }
    }
}

export const notifications = new Notifications();