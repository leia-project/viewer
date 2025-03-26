import { writable, type Writable } from "svelte/store";
import { Commands } from "./commands";
import KeyBindingHandler from "./key-binding-handler";

import type { Command } from "./command";
import type { MarvinApp } from "../../marvin";

export class CommandPalette {
	
	private keyBindingHandler: KeyBindingHandler;
	public open: Writable<boolean> = writable(false);
	public commands: Commands;

	constructor(app: MarvinApp) {
		this.commands = new Commands(app);
		this.keyBindingHandler = new KeyBindingHandler(this.commands);
	}

	public run(command: Command) {
		this.open.set(false);
		command.run();
	}

	public addCommand(command: Command) {
		// check if there is a command with the same name or keys
		for (const c of this.commands) {
			if (c.name === command.name || c.keys === command.keys) {
				console.error(`Command with name ${command.name} or keys ${command.keys} already exists`);
				return;
			}
		}

		this.commands.push(command);
	}
}
