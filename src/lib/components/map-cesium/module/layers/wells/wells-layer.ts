import { CustomLayer } from "../custom-layer";
import { writable } from "svelte/store";
import { CustomLayerControl } from "$lib/components/map-core/custom-layer-control";
import * as Cesium from "cesium";
import LayerControlSlider from "../../../LayerControlSlider/LayerControlSlider.svelte";

import type { Map } from "../../map";
import type { Writable } from "svelte/store";
import type { LayerConfig } from "$lib/components/map-core/layer-config";
import { csvToArray } from "../../utils/csv-utils";
import { MonitoringWells } from "./monitoring-wells";
import { FreaticLine } from "./freatic-line";

export class WellsLayer extends CustomLayer {
	private loaded: boolean;
	private loading: boolean;
	private timeControl: CustomLayerControl | undefined;
	private freaticLine: FreaticLine | undefined;

	public timeValue: Writable<number>;
	private displayValue: Writable<string>;

	constructor(map: Map, config: LayerConfig) {
		super(map, config);
		this.loaded = false;
		this.loading = false;
		this.timeValue = writable<number>(0);
		this.displayValue = writable<string>("");
		this.source = new Cesium.CustomDataSource(this.config.id);

		this.addListeners();
	}

	private addListeners(): void {
		this.timeValue.subscribe(v => {
			this.timeChanged(v);
		})
	}

	private createSliderControl(min: number, max: number, step: number): void {
		this.timeControl = new CustomLayerControl();
		this.timeControl.component = LayerControlSlider;
		this.timeControl.props = { value: this.timeValue, title: "Datum/Tijd", minLabel: " ", maxLabel: " ", min: min, max: max, step: step, displayValue: this.displayValue };
		this.addCustomControl(this.timeControl);
	}

	private timeChanged(time: number): void {
		this.displayValue.set(this.freaticLine?.data[time]['']);
		this.freaticLine?.generateFreaticLinePast('ew', time);
	}

	private async loadData(): Promise<void> {
		this.loading = true;

		if(!this.config.settings["dataUrl"] || !this.config.settings["configUrl"]) {
			console.log("Well layer: missing dataUrl or configUrl")
			return;
		}

		const configData = await this.fetchData(this.config.settings["configUrl"]);
		const parsedConfig = csvToArray(configData);

		const wellData = await this.fetchData(this.config.settings["dataUrl"]);
		const parsedData = csvToArray(wellData);
		//Remove empty lines (if existing) from end of data file:
		for (let x=0; x<parsedData.length; x++) { 
			console.log(parsedData.length);
			console.log(parsedData[parsedData.length-1]);
			if (!parsedData[parsedData.length-1][Object.keys(parsedData[parsedData.length-1])[0]]) {
				parsedData.pop(); //Remove last line if empty
			} else {
				break
			}
		}

		let peilbuizen = new MonitoringWells(this.source, parsedData, parsedConfig);
		peilbuizen.generateMonitoringWells();

		this.freaticLine = new FreaticLine(this.source, parsedData, parsedConfig);
		this.freaticLine.generateFreaticLine();

		const numberOfMeasurements = this.freaticLine.data.length - 1;
		const min = 1;
		const max = numberOfMeasurements;
		const step = 1;
		this.timeValue.set(numberOfMeasurements);

		this.createSliderControl(min, max, step);

		this.loaded = true;
		this.loading = false;
	}

	private async fetchData(url: string): Promise<string> {
		const response = await fetch(url);
		return await response.text();
	}

	public show(): void {
		if (!this.loaded && !this.loading) {
			this.loadData();
		}

		if (this.source) {
			this.source.show = true;
			this.map.refresh();
		}
	}

	public hide(): void {
		if (this.source) {
			this.source.show = false;
			this.map.refresh();
		}
	}
}