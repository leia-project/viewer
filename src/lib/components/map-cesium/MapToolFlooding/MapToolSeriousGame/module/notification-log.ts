
import { Dispatcher } from "$lib/components/map-core/event/dispatcher";
import type { NotificationType } from "$lib/components/map-core/notifications/notification-type";
import { get, writable, type Writable, type Unsubscriber } from "svelte/store";


export interface INotification {
	type: NotificationType;
	title: string;
	message: string;
	component?: any;
	duration?: number;
}


export class NotificationLog extends Dispatcher {

	public log: Writable<Array<INotification>> = writable([]);
	public live: Writable<Array<INotification>>	= writable([]);

	public showLog: Writable<boolean> = writable(false);
	public showLogUnsubscriber: Unsubscriber;
	private timeoutIds: NodeJS.Timeout[] = [];

    constructor() {
		super();
		this.showLogUnsubscriber = this.showLog.subscribe((b: boolean) => {
			this.timeoutIds.forEach(id => clearTimeout(id));
			this.live.set([]);
			this.dispatch("logToggled", { show: b });
		});
    }

    public send(notification: INotification): void {
		const updatedLog = [...get(this.log), notification];
		if (updatedLog.length > 50) updatedLog.shift();
		this.log.set([...get(this.log).filter(n => n.message !== notification.message)]);
		setTimeout(() => {
			this.log.set([...get(this.log), notification]);
			this.live.set([...get(this.live), notification]); 
			this.dispatch("notificationAdded", {});
		}, 10);
		const timeoutId = setTimeout(() => {
			const live = get(this.live);
			const shifted = live.shift();
			if (shifted) this.live.set(live);
			this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
		}, notification.duration ?? 10000);
		this.timeoutIds.push(timeoutId);
    }

}
