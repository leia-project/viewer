<script lang="ts">
	import { writable, type Writable } from "svelte/store";
	import { _ } from "svelte-i18n";
	import type { Command } from "../module/command-center/command";
	import type { MarvinApp } from "../marvin";

	export let app: MarvinApp;

	let selectedIndex = 0;
	let searchInput = "";
	const results: Writable<Array<{ display: string; command: Command }>> = writable([]);


	//result command holds category, derive store with groupped commands by category
	$: categories = groupCommands($results);

	function groupCommands(res: Array<{ display: string; command: Command }>) {
		const categories = new Map<string, Array<{ display: string; command: Command; idx: number }>>();
		res.forEach((result) => {
			const category = result.command.category;
			if (!categories.has(category)) {
				categories.set(category, []);
			}
			categories.get(category)?.push({ display: result.display, command: result.command, idx: 0 });
		});

		let i = 0;
		categories.forEach((commands) => {
			commands.forEach((command) => {
				command.idx = i;
				i++;
			});
		});

		return categories;
	}

	let open = app.commandPalette.open;
	let inputElement: HTMLInputElement | undefined = undefined;

	$: {
		if (open) {
			window.addEventListener("keydown", keyDown, true);
			results.set(app.commandPalette.commands.getAll());
			inputElement?.focus();
			selectedIndex = 0;
		} else {
			window.removeEventListener("keydown", keyDown);
		}
	}

	function scrollToSelected(): void {
		const selectedElement = document.getElementById(`cp-command-${selectedIndex}`);
		selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}

	function keyDown(e: KeyboardEvent) {
		if (!open) {
			return;
		}

		const key = e.key.toLowerCase();
		if (key === "escape") {
			focusOut();
		}

		if (key === "enter" || key === "tab") {
			const command = Array.from(categories.values())
				.flat()
				.find((c) => c.idx === selectedIndex)?.command;
			if (command) {
				triggerCommand(command);
			}

			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}

		if (key === "arrowdown") {
			selectedIndex = selectedIndex + 1 > $results.length - 1 ? 0 : selectedIndex + 1;
			scrollToSelected();
		}

		if (key === "arrowup") {
			selectedIndex = selectedIndex - 1 < 0 ? $results.length - 1 : selectedIndex - 1;
			scrollToSelected();
		}
	}

	function search() {
		selectedIndex = 0;
		if (!searchInput) {
			results.set(app.commandPalette.commands.getAll());
			return;
		} else {
			results.set(app.commandPalette.commands.search(searchInput));
		}
	}

	function triggerCommand(command: Command) {
		app.commandPalette.run(command);
	}

	function focusOut() {
		// make sure if a user clicks on a command, it doesn't close the command palette before the
		// click is registered
		setTimeout(() => {
			app.commandPalette.open.set(false);
			searchInput = "";
		}, 300);
	}

	function getKeyText(key: string): string {
		return key === "control" ? "ctrl" : key;
	}
</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if $open}
<div class="command-palette-container">
	<div class="command-palette">
		<div class="command-palette-input-container">
			<input
				bind:this={inputElement}
				type="text"
				class="command-palette-input"
				placeholder={$_("commands.searchPlaceholder")}
				bind:value={searchInput}
				on:focusout={() => {
					focusOut();
				}}
				on:input={() => {
					search();
				}}
			/>
		</div>
		<hr class="command-palette-divider" />
		<div class="command-palette-results">
			<div class="command-palette-categories">
				{#if categories}
					{#each Array.from(categories.keys()) as category}
						<div class="command-palette-category">
							<div class="command-palette-category-title">{$_(category)}</div>
							<hr class="command-palette-divider" />
							{#each categories.get(category) ?? [] as command}
								<div
									class="command-palette-command {command.idx === selectedIndex ? 'command-palette-command-selected' : ''}"
									id={`cp-command-${command.idx}`}
									on:click={() => {
										triggerCommand(command.command);
									}}
								>
									<div class="command-palette-command-display">
										{@html command.display}
									</div>
									{#if command.command.keys && command.command.keys.length > 0}
										<div class="command-palette-command-keys">
											{#each command.command.keys as key}
												<kbd class="command-palette-key">{getKeyText(key)}</kbd>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
					<!-- {#each results as command, i}
						<div
							class="flex h-[2.2rem] cursor-pointer items-center justify-between gap-2 overflow-hidden p-2 text-sm text-black
						{i === selectedIndex ? 'bg-surface-100' : ''} rounded-md"
							id={`cp-command-${i}`}
							onclick={() => {
								triggerCommand(command.command);
							}}
						>
							<div class="justify-left w-fit-content h-fit-content items-center overflow-hidden text-ellipsis whitespace-nowrap">
								{@html command.display}
							</div>
							{#if command.command.keys && command.command.keys.length > 0}
								<div class="flex shrink gap-2">
									{#each command.command.keys as key}
										<kbd class="kbd">{getKeyText(key)}</kbd>
									{/each}
								</div>
							{/if}
						</div>
					{/each} -->
				{/if}
			</div>
		</div>
	</div>
</div>
{/if}


<style>
	:global(.cmd-highlight) {
		font-size: 1.25rem;
		color: #9ca3af;
		font-weight: bold;
		display: inline;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.command-palette-container {
		position: fixed;
		left: 50%;
		top: 25%;
		display: flex;
		width: 37rem;
		transform: translateX(-50%);
		flex-direction: column;
	}

	.command-palette {
		color: #1a1a1a; /* Equivalent to text-dark */
		border: 1px solid #e5e7eb; /* Equivalent to border-surface-200 */
		background-color: #f9fafb; /* Equivalent to bg-surface-50 */
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		border-radius: 0.375rem;
		padding: 0.5rem;
	}

	.command-palette-input-container {
		width: 100%;
	}

	.command-palette-input {
		outline: none;
		display: flex;
		width: 100%;
		border: none;
		font-size: 0.875rem; /* Equivalent to text-sm */
		color: #000000; /* Equivalent to text-black */
	}

	.command-palette-divider {
		border: 1px solid #e5e7eb; /* Equivalent to border-surface-200 */
	}

	.command-palette-results {
		max-height: 20rem;
		overflow-y: auto;
	}

	.command-palette-categories {
		padding-top: 0.25rem;
	}

	.command-palette-category {
		margin-right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.command-palette-category-title {
		color: #6b7280; /* Equivalent to text-surface-600 */
		margin-top: 0.5rem;
		padding-left: 0.5rem;
		font-size: 0.875rem; /* Equivalent to text-sm */
	}

	.command-palette-command {
		display: flex;
		height: 2.2rem;
		cursor: pointer;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		overflow: hidden;
		padding: 0.5rem;
		font-size: 0.875rem; /* Equivalent to text-sm */
		color: #000000; /* Equivalent to text-black */
		border-radius: 0.375rem;
	}

	.command-palette-command:hover {
		background-color: #f3f4f6; /* Equivalent to hover:bg-surface-100 */
	}

	.command-palette-command-selected {
		background-color: #f3f4f6; /* Equivalent to bg-surface-100 */
	}

	.command-palette-command-display {
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.command-palette-command-keys {
		display: flex;
		flex-shrink: 0;
		gap: 0.5rem;
	}

	.command-palette-key {
		font-size: 1rem; /* Equivalent to text-large */
	}
</style>
