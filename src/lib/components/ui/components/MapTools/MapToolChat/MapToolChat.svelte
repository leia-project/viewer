<script lang="ts">
	/* Imports */
	import { getContext } from "svelte";

	/* Carbon button */
	import QuestionAnswering from "carbon-icons-svelte/lib/QuestionAnswering.svelte";

	import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";

	import { toggleChat, chatApiUrl } from "./chat-store";
	import { _ } from "svelte-i18n";

	const { registerTool } = getContext<any>("mapTools");

	export let id: string;
	export let label: string;

	/* Construct & wire */
	let tool = new MapToolMenuOption(id, QuestionAnswering, label, false, undefined, true, false);

	registerTool(tool);

	$: label = label ?? $_("tools.chat.label");
	$: {
		tool.label.set(label);
	}

	/* Pass the tggleChat function */
	tool.onToolButtonClick = toggleChat;

	/* Settings arrive once the map config has loaded; push them into the store
       so ChatPanel can read them from outside this component's tree. */
	tool.settings.subscribe((settings) => {
		chatApiUrl.set(settings?.apiUrl);
	});
</script>
