<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import type { Game } from "../module/game";
	import { SkipForwardSolidFilled, TimeFilled, Timer } from "carbon-icons-svelte";
	import Pill from "./Pill.svelte";

	export let game: Game;

	const startTime = game.startTime;
	const elapsedTime = game.elapsedTime;
	$: currentTime = new Date($startTime + $elapsedTime * 3600000).toLocaleTimeString("nl", {
		hour: "2-digit",
		minute: "2-digit"
	});
   
</script>


<div class="time-control">
	<Button
		kind="secondary"
		size="small"
		icon={SkipForwardSolidFilled}
		on:click={() => game.changeStep("next")}
	>Forward</Button>
	<div class="times">
		<Pill 
			icon={TimeFilled} 
			label="Time" 
			bind:value={currentTime}
		/>
		<Pill 
			icon={Timer} 
			label="Since Breach" 
			bind:value={$elapsedTime}
			unit={"hours"}
		/>
	</div>
</div>


<style>
   .time-control {
		text-align: end;
		padding: 1rem;
   }
   .times {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		column-gap: 0.5rem;
		margin-top: 10px;
   }

</style>