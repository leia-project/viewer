import { _ } from "svelte-i18n";
import { get } from "svelte/store";

export interface ICommand {
	category: string;
	name: string;
	dev: boolean;
	keys: Array<string> | undefined;

	run(): void;
}

export abstract class Command implements ICommand {
	public category: string;
	public name: string;
	public dev: boolean;
	public keys: Array<string> | undefined;

	constructor(category: string, name: string, dev: boolean, keys: Array<string> | undefined) {
		this.category = category;
		this.name = name;
		this.dev = dev;
		this.keys = keys;
	}

	// getter for translated name
	get displayName(): string {
		return get(_)(this.name);
	}

	public abstract run(): void;
}

export class DefaultCommand extends Command {
	private command = () => {};

	constructor(category: string, name: string, dev: boolean, keys: Array<string> | undefined, command: () => void) {
		super(category, name, dev, keys);
		this.command = command;
	}

	run(): void {
		this.command();
	}
}
