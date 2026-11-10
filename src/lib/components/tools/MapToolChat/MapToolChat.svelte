<script lang="ts">
	/* Imports */
	import { getContext } from "svelte";

	/* Carbon button */
	import QuestionAnswering from "carbon-icons-svelte/lib/QuestionAnswering.svelte";

	import { MapToolMenuOption } from "../MapToolMenuOption";

	import ChatPanel from "./ChatPanel.svelte";
	import GaiaLayersSection from "./GaiaLayers/GaiaLayersSection.svelte";
	import { chatApiUrl } from "./chat-store";
	import { addGaiaLayers } from "./GaiaLayers/gaia-layers";
	import { _ } from "svelte-i18n";

	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let id: string;
	export let label: string;

	/* Construct & wire */
	let tool = new MapToolMenuOption(id, QuestionAnswering, label, false);

	registerTool(tool);

	/* Settings arrive once the map config has loaded; push them into the store
       so ChatPanel can read them from outside this component's tree. */
	tool.settings.subscribe((settings) => {
		chatApiUrl.set(settings?.apiUrl);
	});

	const layers = map.layers;

	/* The datasets of the same API as the chat, as layers of this map. */
	let gaiaLayersFor: string | undefined;
	$: if (map && $chatApiUrl && gaiaLayersFor !== $chatApiUrl) {
		gaiaLayersFor = $chatApiUrl;
		addGaiaLayers(map.layerLibrary, $chatApiUrl).catch((error) => {
			console.error("Could not load the Gaia layers:", error);
		});
	}

	/* Height of the chat in px, set by dragging the handle; undefined keeps the CSS default. */
	const MIN_CHAT_HEIGHT = 160;
	const MIN_LAYERS_HEIGHT = 96;
	const KEYBOARD_STEP = 16;
	let chatHeight: number | undefined;
	let toolHeight = 0;
	let bottomEl: HTMLDivElement;
	let dragStart: { y: number; height: number } | undefined;

	function setChatHeight(height: number) {
		const max = Math.max(MIN_CHAT_HEIGHT, toolHeight - MIN_LAYERS_HEIGHT);
		chatHeight = Math.round(Math.min(Math.max(height, MIN_CHAT_HEIGHT), max));
	}

	function startResize(event: PointerEvent) {
		if (event.button !== 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragStart = { y: event.clientY, height: bottomEl.offsetHeight };
		event.preventDefault();
	}

	function resize(event: PointerEvent) {
		if (!dragStart) return;
		/* Dragging up makes the chat taller. */
		setChatHeight(dragStart.height - (event.clientY - dragStart.y));
	}

	function stopResize() {
		dragStart = undefined;
	}
</script>

<!-- Hidden instead of destroyed, so the conversation survives closing the sidebar. -->
<div class="chat-tool" class:hidden={$selectedTool !== tool} bind:clientHeight={toolHeight}>
	<div class="layers-container">
		<GaiaLayersSection library={map.layerLibrary} layers={$layers} />
	</div>
	<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
	<div
		class="resize-handle"
		class:dragging={dragStart}
		role="separator"
		aria-orientation="horizontal"
		aria-label="Grootte van de chat aanpassen"
		tabindex="0"
		on:pointerdown={startResize}
		on:pointermove={resize}
		on:pointerup={stopResize}
		on:pointercancel={stopResize}
	>
		<span class="resize-handle__grip" />
	</div>
	<div
		class="bottom-container"
		bind:this={bottomEl}
		style:height={chatHeight ? `${chatHeight}px` : undefined}
	>
		<ChatPanel {map} />
	</div>
</div>

<style>
	/* Lets .chat-tool take exactly the visible height of the sidebar (100cqh), so
	   only the layers scroll and the chat stays at the bottom. Only while the chat
	   is open; the other tools keep the sidebar as it is. */
	:global(.content-wrapper:has(> .tool-content > .chat-tool:not(.hidden))) {
		container-type: size;
		/* Nothing scrolls here, so no gutter for a scrollbar beside the chat. */
		scrollbar-gutter: auto;
	}

	/* The sidebar's bottom margin would leave a gap below the chat. */
	:global(.tool-content:has(> .chat-tool:not(.hidden))) {
		margin-bottom: 0;
	}

	.chat-tool {
		height: 100cqh;
		display: flex;
		flex-direction: column;
	}

	.layers-container {
		flex: 1;
		min-height: 6rem;
		overflow-y: auto;
	}

	.resize-handle {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 0.75rem;
		border-top: 1px solid var(--cds-ui-03, #e0e0e0);
		border-bottom: 1px solid var(--cds-ui-03, #e0e0e0);
		background: var(--cds-ui-02);
		cursor: row-resize;
		touch-action: none;
	}

	.resize-handle__grip {
		width: 2rem;
		height: 0.25rem;
		border-radius: 0.125rem;
		background: var(--cds-ui-04, #8d8d8d);
	}

	.resize-handle:hover .resize-handle__grip,
	.resize-handle:focus-visible .resize-handle__grip,
	.resize-handle.dragging .resize-handle__grip {
		background: var(--cds-interactive-01, #0f62fe);
	}

	.resize-handle:focus-visible {
		outline: 2px solid var(--cds-focus, #0f62fe);
		outline-offset: -2px;
	}

	.bottom-container {
		flex-shrink: 0;
		height: min(32rem, 70vh);
		min-height: 10rem;
		/* Leaves room for the handle and some layers when the sidebar is short. */
		max-height: calc(100% - 6rem - 0.75rem);
		/* Above the sidebar's overflow gradient. */
		position: relative;
		z-index: 2;
	}

	.chat-tool.hidden {
		display: none;
	}
</style>
