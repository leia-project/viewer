import { writable, type Writable } from "svelte/store";
import type { FloodLayerController } from "../../layer-controller";



export class GameLayerController {

	public selectedRole: Writable<Array<string>> = writable([]);

	private backgroudLayer: Writable<string> = writable("1");
	private floodLayerController?: FloodLayerController;


	constructor() {

	}

	private setRole(role: string) {
		// remove role specific layers from unselected roles
		
		// add layers from selected role
	}
}