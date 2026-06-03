export class DispatcherEvent {
    public name: string;
    public callbacks: Array<(n: unknown) => unknown>;

    constructor(name: string) {
        this.name = name;
        this.callbacks = [];
    }

    public registerCallback(callback: (n: unknown) => unknown): void {
        this.callbacks.push(callback);
    }

    public unregisterCallback(callback: (n: unknown) => unknown): void {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

     public fire(data: unknown): void {
        const callbacks = this.callbacks.slice(0);
        callbacks.forEach((callback) => {
            callback(data);
        });
    }
}