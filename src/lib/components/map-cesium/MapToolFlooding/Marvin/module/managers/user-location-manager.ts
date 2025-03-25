import { writable, type Writable } from "svelte/store";

export class UserLocationManager {
	public failed: Writable<boolean> = writable(false);
	public location: Writable<string | undefined> = writable(undefined);

	constructor() {}

	getLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					this.location .set(`POINT(${longitude} ${latitude})`);
				},
				(error) => {
					this.failed.set(true);
				},
				{
					enableHighAccuracy: true, // Use GPS for more accurate results
					timeout: 5000, // Maximum wait time for location
					maximumAge: 0 // Prevent caching of location
				}
			);
		} else {
			console.error("Geolocation is not supported by this browser.");
		}
	}
}
