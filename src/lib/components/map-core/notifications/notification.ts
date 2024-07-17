import { NotificationType } from "./notification-type";

export class Notification {
    public type: NotificationType;
    public title: string;
    public message: string;
    public timeout: number;
    public showDate: boolean;
    public logToConsole: boolean;
    public error: Error;

    constructor(type: NotificationType, title: string, message: string, timeout: number = 5000, showDate: boolean, logToConsole: boolean = false) {
        this.type = type;
        this.title = title;
        this.message = message;
        this.timeout = timeout;
        this.showDate = showDate;
        this.logToConsole = logToConsole;
    }
}