<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import type { Game } from "../game";

	export let game: Game;
   
</script>


<div class="time-control">
	<Button
		kind="secondary"
		size="small"
		on:click={() => game.changeStep("next")}
	>Forward</Button>
</div>


<style>
   .time-control {
		pointer-events: all;
   }
</style>