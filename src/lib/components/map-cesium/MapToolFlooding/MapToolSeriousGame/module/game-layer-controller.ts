import { writable, type Writable } from "svelte/store";
import type { FloodLayerController } from "../../layer-controller";



export class GameLayerController {

    public selectedROle: Writable<Array<string>> = writable([]);

    private backgroudLayer: Writable<string> = writable("satellite");
    private floodLayerController?: FloodLayerController;


}