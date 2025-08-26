
import { get, writable, type Writable, type Unsubscriber } from "svelte/store";
import { Dispatcher, NotificationType } from "../external-dependencies";


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
		const filteredLog = updatedLog.filter(n => n.message !== notification.message);
		this.log.set([...filteredLog, notification]);

		const currentLive = get(this.live);
		const filteredLive = currentLive.filter(n => n.message !== notification.message);
		this.live.set([...filteredLive, notification]);
		
		this.dispatch("notificationAdded", {});
		
		const timeoutId = setTimeout(() => {
			const live = get(this.live);
			const shifted = live.shift();
			if (shifted) this.live.set(live);
			this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
		}, notification.duration ?? 10000);
		this.timeoutIds.push(timeoutId);
	}

}
