import type { Commands } from "./commands";

/**
 * Handle keybindings pressed by the user
 */
export default class KeyBindingHandler {
	private commands: Commands;
	private keysDown: Array<string>;
	private clearEvent: any;

	constructor(commands: Commands) {
		this.commands = commands;
		this.keysDown = new Array<string>();
		this.setupEvents();
	}

	private setupEvents(): void {
		this.addKeyDownEvent();
		this.addKeyUpEvent();
	}

	private addKeyDownEvent(): void {
		window.addEventListener(
			"keydown",
			(e) => {
				const key = e.key.toLowerCase();

				if (this.keysDown.includes(key)) {
					return;
				}

				this.keysDown.push(key);
				this.handleKeysDown(e, this.keysDown);

				window.clearTimeout(this.clearEvent);
				this.clearEvent = window.setTimeout(() => {
					this.keysDown = new Array<string>();
				}, 3000);
			},
			true
		);
	}

	private addKeyUpEvent(): void {
		window.addEventListener(
			"keyup",
			(e) => {
				const key = e.key.toLowerCase();
				this.keysDown = this.keysDown.filter((k) => {
					return k !== key;
				});
			},
			true
		);
	}

	private handleKeysDown(event: any, keys: Array<string>): void {
		if (keys.length <= 1) {
			return;
		}

		const keyString = keys.join("");

		for (let i = 0; i < this.commands.length; i++) {
			const command = this.commands[i];

			if (command.keys === undefined) {
				continue;
			}

			const cKeyString = command.keys.join("");

			if (cKeyString === keyString) {
				command.run();
				event.preventDefault();
				event.stopPropagation();
			}
		}
	}
}
