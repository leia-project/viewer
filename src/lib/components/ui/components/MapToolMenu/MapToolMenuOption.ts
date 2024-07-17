import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { CarbonIcon } from "carbon-icons-svelte";

export class MapToolMenuOption {
	public id: string;
	public icon: CarbonIcon;
	public label: Writable<string>;
	public settings: Writable<any>;
	public bottom: boolean;
	public width: Writable<string>;
	public showInToolbar: boolean;
	public blockInteractionsFromOthers: boolean;
	public interactionsBlocked: Writable<boolean>;
	public openMenuOnClick: boolean;
	public onToolButtonClick!: (e: CustomEvent<any>) => void;

	constructor(id: string, icon: CarbonIcon, label: string, bottom: boolean = false, width: string | undefined = undefined, showInToolbar: boolean = true, openMenuOnClick: boolean = true) {
		this.id = id;
		this.icon = icon;
		this.label = writable<string>(label);
		this.settings = writable<any>(undefined);
		this.bottom = bottom;	
		this.width = writable<string>(width);
		this.showInToolbar = showInToolbar;
		this.blockInteractionsFromOthers = false;;
		this.interactionsBlocked = writable<boolean>(false);
		this.openMenuOnClick = openMenuOnClick;
	}

	public fireClick(e: CustomEvent<any>): void {
		if(this.onToolButtonClick) {
			this.onToolButtonClick(e);
		}
	}
}
