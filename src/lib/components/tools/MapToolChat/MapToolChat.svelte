<script lang="ts">
	/* Imports */
	import { getContext, onDestroy } from "svelte";

	/* Carbon button */
	import QuestionAnswering from "carbon-icons-svelte/lib/QuestionAnswering.svelte";

	import { MapToolMenuOption } from "../MapToolMenuOption";

	import ChatPanel from "./ChatPanel.svelte";
	import { toggleChat, chatApiUrl } from "./chat-store";
	import { addGaiaLayers } from "./GaiaLayers/gaia-layers";
	import { _ } from "svelte-i18n";

	const { registerTool, getMapContainer, map } = getContext<any>("mapTools");

	export let id: string;
	export let label: string;

	/* Construct & wire */
	let tool = new MapToolMenuOption(id, QuestionAnswering, label, false, undefined, true, false);

	registerTool(tool);

	/* Pass the tggleChat function */
	tool.onToolButtonClick = toggleChat;

	/* Settings arrive once the map config has loaded; push them into the store
       so ChatPanel can read them from outside this component's tree. */
	tool.settings.subscribe((settings) => {
		chatApiUrl.set(settings?.apiUrl);
	});

	/* The panel floats over the map, so it is mounted in the map container
       instead of in the tool menu. */
	const panel = new ChatPanel({ target: getMapContainer(), props: { map } });
	onDestroy(() => panel.$destroy());

	/* The datasets of the same API as the chat, as layers of this map. */
	let gaiaLayersFor: string | undefined;
	$: if (map && $chatApiUrl && gaiaLayersFor !== $chatApiUrl) {
		gaiaLayersFor = $chatApiUrl;
		addGaiaLayers(map.layerLibrary, $chatApiUrl).catch((error) => {
			console.error("Could not load the Gaia layers:", error);
		});
	}
</script>
