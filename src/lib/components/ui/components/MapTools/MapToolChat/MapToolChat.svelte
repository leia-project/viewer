<script lang="ts">
    /* Imports */
    import { getContext } from "svelte";

    /* Carbon button */
    import QuestionAnswering from "carbon-icons-svelte/lib/QuestionAnswering.svelte";

    import { MapToolMenuOption } from "../../MapToolMenu/MapToolMenuOption";

    import { toggleChat, chatApiUrl } from "./chat-store";
    import { addGaiaLayers } from "./GaiaLayers/gaia-layers";
	import { _ } from "svelte-i18n";

    export let label: string | undefined;

    const { registerTool, map } = getContext<any>("mapTools");
    
    const id: string = "chat"

    /* Construct & wire */
    let tool = new MapToolMenuOption(
        id, 
        QuestionAnswering, 
        label, 
        false,
       undefined, 
       true,
       false)

    registerTool(tool)

    $: label = label ?? $_("tools.chat.label");
    $: { tool.label.set(label); }
    
    /* Pass the tggleChat function */
    tool.onToolButtonClick = toggleChat;

    /* Settings arrive once the map config has loaded; push them into the store
       so ChatPanel can read them from outside this component's tree. */
    tool.settings.subscribe((settings) => {
        chatApiUrl.set(settings?.apiUrl);
    });

    /* The datasets of the same API as the chat, as layers of this map. */
    let gaiaLayersFor: string | undefined;
    $: if (map && $chatApiUrl && gaiaLayersFor !== $chatApiUrl) {
        gaiaLayersFor = $chatApiUrl;
        addGaiaLayers(map.layerLibrary, $chatApiUrl).catch((error) => {
            console.error("Could not load the Gaia layers:", error);
        });
    }

</script>