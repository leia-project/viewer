import { get } from "svelte/store";
import fuzzysort from "fuzzysort";
import { Command, DefaultCommand } from "./command";
import type { MarvinApp } from "../../marvin";


export class Commands extends Array<Command> {

	private app: MarvinApp;

	constructor(app: MarvinApp) {
		super();
		this.app = app;
		this.populate();
	}

	private populate() {
		const paletteCommand = new DefaultCommand("commands.catergoryMisc", "commands.openPalette", false, ["control", "shift", "p"], () => {
			this.app.commandPalette.open.set(true);
		});

		const deleteAllChatsCommand = new DefaultCommand("commands.categoryChat", "commands.deleteAllChats", false, ["control", "shift", "d"], () => {
			for (const entry of get(this.app.qaManager.entries)) {
				this.app.qaManager.removeEntry(entry.id);
			}
		});

		const hideAllLayersCommand = new DefaultCommand("commands.categoryLayers", "commands.hideAllLayers", false, ["control", "shift", "h"], () => {
			this.app.layerManager.hideAllLayers();
		});

		const showAllLayersCommand = new DefaultCommand("commands.categoryLayers", "commands.showAllLayers", false, ["control", "shift", "s"], () => {
			this.app.layerManager.showAllLayers();
		});

		this.push(paletteCommand);
		this.push(deleteAllChatsCommand);
		this.push(hideAllLayersCommand);
		this.push(showAllLayersCommand);
	}

	/**
	 * Retrieve all commands
	 *
	 * @returns Array of { display: string, command: Command} for display purpose
	 */
	public getAll(): Array<{ display: string; command: Command }> {
		return this.map((c) => {
			return { display: c.displayName, command: c };
		});
	}

	/**
	 * Fuzzy search the current commands
	 *
	 * @param input search string
	 * @returns Array of { display: string, command: Command}
	 */
	public search(input: string): Array<{ display: string; command: Command }> {
		const searchResults = fuzzysort.go(input, this, { key: "displayName" });
		return searchResults.map((sr) => {
			return { display: sr.highlight("<span class='cmd-highlight'>", "</span>") ?? "", command: sr.obj };
		});
	}
}
