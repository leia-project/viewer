import { get, writable, type Writable } from "svelte/store";
import { _ } from "svelte-i18n";
import type { QA } from "../qa";

export class QAManager {

	public entries: Writable<Array<QA>> = writable([]);
	private loading: Writable<boolean>;

	constructor(loading: Writable<boolean> = writable(false)) {
		this.loading = loading;
	}

	public async addEntry(entry: QA): Promise<void> {
		this.entries.update((entries) => [...entries, entry]);
		this.loading.set(true);
		await entry.askGeo();
		setTimeout(() => this.loading.set(false), 5000);
		//this.loading.set(false);
	}

	public async removeEntry(id: string): Promise<void> {
		const entry = get(this.entries).find((entry: any) => entry.id === id);
		if (entry) {
			entry.removeLayers();
		}
		this.entries.update((entries) => entries.filter((entry) => entry.id !== id));
	}

	public getQAError(input: string): string {
		const translation = get(_)(input);
		return translation && translation !== input ? translation : get(_)("qa.errors.default");
	}
}
