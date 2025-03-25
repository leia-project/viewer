import { get, writable, type Writable } from "svelte/store";
import { _ } from "svelte-i18n";
import type { QA } from "../qa";

export class QAManager {

	public entries: Writable<Array<QA>> = writable([]);

	constructor() {}

	public async addEntry(entry: any): Promise<void> {
		this.entries.update((entries: any) => [...entries, entry]);
		entry.askGeo();
	}

	public async removeEntry(id: string): Promise<void> {
		const entry = get(this.entries).find((entry: any) => entry.id === id);
		if (entry) {
			entry.removeLayers();
		}

		this.entries.update((entries: any[]) => entries.filter((entry: any) => entry.id !== id));
	}

	public getQAError(input: string): string {
		const translation = get(_)(input);
		return translation && translation !== input ? translation : get(_)("qa.errors.default");
	}
}
