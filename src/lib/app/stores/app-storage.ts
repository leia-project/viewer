import { browser } from "$app/environment";

class AppStorage {
    values: Array<string>;

    constructor() {
        this.values = [];
    }

    register<T>(writable: any, path: string, init: T | undefined = undefined) {
        this.values.push(writable);

        if (init) {
            writable.set(this.getValue<T>(path, init));
        }

        this._subscribeToWritable(writable, path);
    }

    getValue<T>(path: string, init: T) {
        if (browser) {
            if (localStorage.getItem(path)) {
                try {
                    const value: T = JSON.parse(localStorage.getItem(path));
                    return value;
                } catch (error) {
                    console.error("Unable to parse local storage value");
                    return init;
                }
            }
        }

        return init;
    }

    _subscribeToWritable(writable: any, path: string) {
        writable.subscribe(value => {
            if (browser) {
                const writeValue = JSON.stringify(value);
                localStorage.setItem(path, writeValue);
            }
        });
    }
}

export const appStorage = new AppStorage();
