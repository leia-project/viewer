<script lang="ts">
	import { _ } from "svelte-i18n";
	import { onMount } from "svelte";
	import { ChevronRight } from "carbon-icons-svelte";
/* 	import { v4 as uuidv4 } from "uuid"; */
	import { QA } from "../module/qa";
/* 	import { DefaultCommand } from "$lib/core/command-center/command"; */
/* 	import { FloatingArrow, arrow, autoUpdate, flip, offset, useDismiss, useFloating, useInteractions, useRole } from "@skeletonlabs/floating-ui-svelte"; */
	import { fade } from "svelte/transition";

	// @ts-ignore
	import Wkt from "wicket";
	
	import type { MarvinApp } from "../marvin";

	export let app: MarvinApp;

	let chatElement: HTMLElement;
	let question ="";
	let geomInput: Array<{ name: string; id: string; data: any }> | undefined = undefined;

	let searchNode: HTMLElement | undefined = undefined;
	$: isSearching = searchNode !== undefined;
	let geomInputSearch: string | undefined = undefined;
	$: filteredGeomInput = getFilteredGeoms(geomInputSearch);
	let searchDropdownIndex: number = -1;
	let selectedGeom: { name: string; id: string; data: any } | undefined;

	$: {
		open = isSearching;
	}

	function getFilteredGeoms(input: string | undefined): Array<{ name: string; id: string; data: any }> | undefined {
		if (!geomInput || !input) return geomInput;
		const filtered = geomInput.filter((geom) => geom.name.toLowerCase().startsWith(input.toLowerCase()));
		return filtered ?? undefined;
	}

	onMount(() => {
		/* createQuestionCommand("Give me the top 50 locations of elderly people in den bosch", ["alt", "1"]);
		createQuestionCommand("Give me all age groups in den bosch", ["alt", "2"]);
		createQuestionCommand("Give me all roads in bazeldonk", ["alt", "3"]);
		createQuestionCommand("Give me all cycling roads in hintham", ["alt", "4"]);
		createQuestionCommand("Show the top 50 areas per percentage of non western migrants in rotterdam", ["alt", "5"]);
		createQuestionCommand("Show areas in den bosch with male and female population where the female population is higher than man", ["alt", "6"]);
		createQuestionCommand("What is the average household size in amsterdam", ["alt", "7"]);
		createQuestionCommand("Show all locations where the number of rental homes is greater than 40% of all houses in den bosch", ["alt", "8"]);
		createQuestionCommand("Give areas containing migrant percentages ranked from high to low in den bosch", ["alt", "9"]);

		const repeatLastChatCommand = new DefaultCommand("commands.categoryChat", "commands.repeatLastChat", false, ["control", "alt", "r"], () => {
			const lastChat = app.qaManager.entries[app.qaManager.entries.length - 1];
			if (lastChat) {
				clearChat();
				question = lastChat.question;
				if (lastChat.geom && lastChat.geomName) {
					selectedGeom = {
						name: lastChat.geomName,
						id: "",
						data: lastChat.geom
					};
				}

				chatElement.focus();
			}
		});

		app.commandPalette.addCommand(repeatLastChatCommand);

		const focusCommand = new DefaultCommand("commands.categoryFocus", "commands.focusChat", false, ["control", "shift", "c"], () => {
			if (chatElement) {
				chatElement.focus();
			}
		});

		app.commandPalette.addCommand(focusCommand); */
	});

	/* function createQuestionCommand(input: string, keys: Array<string> | undefined = undefined): void {
		const cmd = new DefaultCommand("commands.categoryExampleQuestions", input, false, keys, () => {
			clearChat();
			question = input;
			chatElement.focus();
		});

		app.commandPalette.addCommand(cmd);
	} */

	function handleKeydown(event: KeyboardEvent) {
		if (isSearching && event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== "Enter" && event.key !== "Space") {
			searchDropdownIndex = 0;
		}

		if (event.key === "Backspace") {
			if (isSearching) {
				if (geomInputSearch === undefined || geomInputSearch?.length === 0) {
					deleteSearchNode();
					clearChat();
					return;
				}
			}
		}

		if (event.key === "/") {
			insertSearchNode();
			return;
		}

		if (event.key === "Enter") {
			if (isSearching) {
				selectGeomInput();
			} else {
				executeQuestion();
			}

			event.preventDefault();
			return;
		}

		if (event.key === "Escape") {
			deleteSearchNode();
			return;
		}

		if (isSearching && event.key === "ArrowDown" && filteredGeomInput) {
			searchDropdownIndex = searchDropdownIndex + 1 >= filteredGeomInput.length ? 0 : searchDropdownIndex + 1;
			return;
		}

		if (isSearching && event.key === "ArrowUp" && filteredGeomInput) {
			searchDropdownIndex = searchDropdownIndex - 1 < 0 ? filteredGeomInput.length - 1 : searchDropdownIndex - 1;
			return;
		}
	}

	function chatInputChange(): void {
		if (searchNode) {
			const text = searchNode.textContent?.replace("/", "") ?? "";
			geomInputSearch = text;
		}
	}

	function insertSearchNode(): void {
		geomInput = app.layerManager.getLayersForGeomInput();

		const id = "uuidv4()";
		searchNode = document.createElement("span");
		searchNode.id = id;
		searchNode.innerHTML = "/";
		// add to chatElement

		const selection = window.getSelection();
		if (!selection) return;

		const range = selection.getRangeAt(0);

		// If there is selected text, replace it with the new element
		range.deleteContents();

		// Insert the new element at the cursor position
		range.insertNode(searchNode);

		// Move the cursor after the inserted element
		const newRange = document.createRange();
		newRange.setStartAfter(searchNode); // Set cursor right after the new element
		newRange.setEndAfter(searchNode); // Ensures the range is collapsed to the new position
		selection.removeAllRanges(); // Remove the current selection
		selection.addRange(newRange);

		setTimeout(() => {
			clearSearchNodeContents();
			chatInputChange();
			searchDropdownIndex = 0;
		}, 10);
	}

	function clearSearchNodeContents(): void {
		if (searchNode) {
			searchNode.innerHTML = "/";
			// set cursor to the end of the searchNode
			const selection = window.getSelection();
			const range = document.createRange();

			if (!selection || !range) return;

			range.setStart(searchNode, 1);
			range.setEnd(searchNode, 1);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}

	function deleteSearchNode(): void {
		if (searchNode) {
			searchNode.remove();
			searchNode = undefined;
			selectedGeom = undefined;
		}
	}

	function selectGeomInput(): void {
		const geom = getSelectedGeom();
		if (!geom) return;

		selectedGeom = geom;

		const selection = window.getSelection();
		const wrapElement = document.createElement("span");
		wrapElement.contentEditable = "false";

		const kbdElement = document.createElement("kbd");
		kbdElement.className = "kbd overflow-none w-fit-content h-fit-content box-content whitespace-nowrap bg-primary-400 text-white";
		kbdElement.textContent = geom.name;
		kbdElement.contentEditable = "false";
		wrapElement.appendChild(kbdElement);

		searchNode?.after(wrapElement);

		deleteSearchNode();

		const inputElement = document.createElement("p");
		inputElement.contentEditable = "true";
		inputElement.innerHTML = "&nbsp;";
		inputElement.className = "w-fit-content h-fit-content whitespace-nowrap";
		chatElement.appendChild(inputElement);

		// Move the cursor to the end of the contenteditable after the <kbd> element
		setTimeout(() => {
			const contentEditableDiv = document.querySelector('[contenteditable="true"]');
			if (contentEditableDiv) {
				const rangeEnd = document.createRange();
				const lastChild = contentEditableDiv.lastChild;

				// If the last child is the <kbd> or a text node, position the cursor at the end
				if (lastChild && lastChild.textContent && selection) {
					rangeEnd.setStart(lastChild, lastChild.textContent.length);
					rangeEnd.setEnd(lastChild, lastChild.textContent.length);
					selection.removeAllRanges();
					selection.addRange(rangeEnd);
				}
			}
		}, 50); // Slight delay to ensure the DOM is updated
	}

	function getSelectedGeom(): { name: string; id: string; data: any } | undefined {
		return filteredGeomInput?.[searchDropdownIndex];
	}

	function executeQuestion() {
		const query = chatElement.textContent;
		if (!query) {
			return;
		}

		let wktString = "";
		let wktName = undefined;

		if (selectedGeom) {
			const wkt = new Wkt.Wkt();
			// ToDo: what if there are more features?
			const wktObj = wkt.read(JSON.stringify(selectedGeom.data.features[0]));
			wktString = wktObj.write();
			wktName = selectedGeom.name;
		}

		const qa = new QA(app, query, wktString, wktName);
		app.qaManager.addEntry(qa);
		clearChat();
	}

	function selectGeom(index: number) {
		searchDropdownIndex = filteredGeomInput?.length ? index : -1;
		selectGeomInput();
	}

	function clearChat() {
		selectedGeom = undefined;
		geomInputSearch = undefined;
		geomInput = undefined;
		searchNode = undefined;
		chatElement.textContent = "";
		question = "";
	}

	// State
	let open = false;
	let elemArrow: HTMLElement | null = null;

	// Use Floating
	/* const floating = useFloating({
		whileElementsMounted: autoUpdate,
		get open() {
			return open;
		},
		onOpenChange: (v) => {
			open = v;
			if (!v) {
				deleteSearchNode();
			}
		},
		strategy: "fixed",
		transform: true,
		get middleware() {
			return [offset(10), flip(), elemArrow && arrow({ element: elemArrow })];
		}
	}); */

	/* // Interactions
	const role = useRole(floating.context);
	//const click = useClick(floating.context);
	const dismiss = useDismiss(floating.context);
	//const interactions = useInteractions([role, click, dismiss]);
	const interactions = useInteractions([role, dismiss]); */
</script>


<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="marvin-container">
	<div class="chat-input-container">
		<div
			bind:this={chatElement}
			on:input={chatInputChange}
			class="editable"
			contenteditable="true"
			data-placeholder={$_("qa.chatPlaceholder")}
			bind:innerHTML={question}
			on:keydown={handleKeydown}
		></div>
		<button on:click={executeQuestion} class="send-button" title="">
			<ChevronRight size={16} />
		</button>
	</div>
	{#if open}
		<div
			class="floating-dropdown"
			transition:fade={{ duration: 200 }}
		>
			{#if filteredGeomInput && filteredGeomInput.length > 0}
				<div class="dropdown-list">
					{#each filteredGeomInput as input, idx}
						<div
							class="dropdown-item {searchDropdownIndex === idx ? 'dropdown-item-active' : ''}"
							on:click={() => selectGeom(idx)}
						>
							<div class="dropdown-item-text">{input.name}</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="no-geom-found">{$_("qa.noGeomFound")}</div>
			{/if}
			<!-- <p>
				You can press the <kbd class="kbd">esc</kbd> key or click outside to
				<strong>*dismiss*</strong> this floating element.
			</p> -->
<!-- 			<FloatingArrow bind:ref={elemArrow} context={floating.context} fill="#575969" /> -->
		</div>
	{/if}
</div>

<style>
	.editable {
		min-height: 20px;
		padding: 5px;
	}

	.editable:empty:before {
		content: attr(data-placeholder);
		color: gray;
		font-style: italic;
	}

	.marvin-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.chat-input-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border: 1px solid var(--surface-200);
		border-radius: 0.375rem;
		padding: 0.25rem;
	}

	.editable {
		flex: 1;
		cursor: text;
		overflow: auto;
		border: none;
		padding: 0.5rem;
		outline: none;
	}

	.editable:empty:before {
		content: attr(data-placeholder);
		color: gray;
		font-style: italic;
	}

	.send-button {
		background-color: var(--primary-500);
		color: white;
		border: none;
		border-radius: 0.375rem;
		padding: 0.5rem;
		cursor: pointer;
	}

	.send-button:hover {
		background-color: var(--primary-600);
	}

	.floating-dropdown {
		position: absolute;
		background-color: var(--surface-100);
		border: 1px solid var(--surface-200);
		border-radius: 0.375rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		min-width: 15rem;
	}

	.dropdown-list {
		display: flex;
		flex-direction: column;
		margin: 0.5rem 0;
	}

	.dropdown-item {
		padding: 0.5rem 1rem;
		cursor: pointer;
	}

	.dropdown-item:hover {
		background-color: var(--primary-400);
		color: white;
	}

	.dropdown-item-active {
		background-color: var(--primary-400);
		color: white;
	}

	.no-geom-found {
		padding: 0.5rem;
		font-size: 0.875rem;
		color: gray;
	}
</style>
