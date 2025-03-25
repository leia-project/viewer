import { addMessages } from "svelte-i18n";
import en from "./en.json";
import nl from "./nl.json";


export function addMarvini18n(): void {
	addMessages("en", en);
	addMessages("nl", nl);
}
