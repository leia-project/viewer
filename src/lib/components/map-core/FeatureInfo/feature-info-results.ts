import { writable } from "svelte/store";

import type { Writable } from "svelte/store";
import { FeatureInfo } from "./feature-info.js";

export class FeatureInfoResults {
	public readonly loading: Writable<boolean>;
	public readonly results: Writable<Array<FeatureInfo>>;
	public readonly selectedFeatureColor: Writable<string>;

	constructor() {
		this.loading = writable<boolean>(false);
        this.results = writable<Array<FeatureInfo>>();
		this.selectedFeatureColor = writable<string>("#ffa31b");
	}

	/**
	 * Clear the feature info results
	 */
	clear() {
		this.results.set(new Array<FeatureInfo>());
	}
}
