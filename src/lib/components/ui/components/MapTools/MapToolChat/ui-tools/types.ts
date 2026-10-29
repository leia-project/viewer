import type { Map } from "$lib/components/map-cesium/module/map";
import type { LabelledLayer } from "./layers";

/* Instructies van de agent aan deze viewer ("voeg deze laag toe"). Ze worden bij
   elke vraag bij de backend aangemeld (AG-UI RunAgentInput.tools); de agent roept
   ze aan, en de viewer beslist of hij ze meteen uitvoert of eerst om akkoord
   vraagt. De backend kent ze niet: het schema hier is het hele contract, dus elke
   frontend heeft zijn eigen set. */

export type ApprovalMode = "auto" | "ask";

export interface UiTool<Args = unknown> {
	name: string;
	/* De agent leest dit: zeg wanneer de tool past en wat elk argument betekent. */
	description: string;
	defaultApproval: ApprovalMode;
	/* Een tool die op een laag werkt, wordt alleen aangeboden als er zo'n laag is,
	   en `layer_ref` mag dan alleen een van die lagen zijn. Zonder dit werkt de
	   tool niet op een bestaande laag. */
	eligibleLayers?: (layers: LabelledLayer[]) => LabelledLayer[];
	/* JSON Schema van de argumenten; `layers` zijn de lagen waar de tool op mag werken. */
	parameters: (layers: LabelledLayer[]) => Record<string, unknown>;
	/* Controleert de ruwe argumenten van het model. Gooi een Error waarvan de tekst
	   zegt wat er anders moet - die gaat terug naar de agent. */
	parse: (raw: unknown) => Args;
	/* De zin voor de goedkeuringskaart. */
	describe: (args: Args) => string;
	/* Voert de wijziging uit. Geeft terug wat de agent te horen krijgt; gooit bij mislukken. */
	execute: (args: Args, map: Map) => Promise<string>;
}
