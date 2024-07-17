import { DispatcherEvent } from "./dispatcher-event";

export class Dispatcher {
    private events: unknown;

    constructor() {
        this.events = {};
    }

    public dispatch(eventName: string, data: unknown): void {
      const event = this.events[eventName];
      if (event) {
          event.fire(data);
      }
    }

    public on(eventName: string, callback: (n: unknown) => unknown): void {
      let event = this.events[eventName];
      if (!event) {
          event = new DispatcherEvent(eventName);
          this.events[eventName] = event;
      }
      event.registerCallback(callback);
    }

    public off(eventName: string, callback: (n: unknown) => unknown): void {
      const event = this.events[eventName];
        if (event && event.callbacks.indexOf(callback) > -1) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete this.events[eventName];
            }
        }
    }
}