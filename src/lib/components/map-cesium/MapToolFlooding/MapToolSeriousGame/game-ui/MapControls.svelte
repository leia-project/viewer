<script lang="ts">
	import { Compass } from "carbon-icons-svelte";
	import type { Game } from "../game";
	import ToolbarButton from "./ToolbarButton.svelte";

    export let game: Game;
    
    function navigateHome() {
        console.log("navigateHome");
    }

    function openStartmenu() {
        console.log("openStartmenu");
    }

</script>


<ToolbarButton icon={Compass} on:click={navigateHome}></ToolbarButton>

<ToolbarButton icon={Compass} on:click={openStartmenu}></ToolbarButton>