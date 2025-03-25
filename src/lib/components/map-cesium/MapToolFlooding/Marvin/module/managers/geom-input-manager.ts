import type { DrawnGeometry } from '../draw/drawn-geometry';

export class GeomInputManager {
	public entries: Array<DrawnGeometry> = [];

	constructor() {}

	public addEntry(entry: DrawnGeometry): void {
		this.entries = [...this.entries, entry];
	}

	public removeEntry(id: string): void {
		this.entries = this.entries.filter((entry: any) => entry.id !== id);
	}

	public findEntry(id: string): DrawnGeometry | undefined {
		return this.entries.find((entry: any) => entry.id === id);
	}
}
