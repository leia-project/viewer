import { v4 as uuidv4 } from 'uuid';
import { writable, type Writable } from "svelte/store";
import type { Location } from "$lib/components/map-cesium/models/location";
import type { GeographicLocation } from '$lib/components/map-core/geographic-location';

export abstract class BreachLocation {

	public uuid: string;
	public name: string | undefined;
	public location: Writable<GeographicLocation> = writable();

	constructor(props: BreachLocationPropertiesBase) {
		this.uuid = props.uuid ?? uuidv4();
		this.name = props.name;
		this.location.set(props.location);
	}
}

export interface BreachLocationPropertiesBase {
	uuid?: string;
	name?: string;
	location: GeographicLocation;
}
