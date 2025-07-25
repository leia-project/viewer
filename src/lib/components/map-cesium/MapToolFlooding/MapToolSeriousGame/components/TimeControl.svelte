<script lang="ts">
	import { Button } from "carbon-components-svelte";
	import type { Game } from "../module/game";
	import { SkipBackSolidFilled, SkipForwardSolidFilled, TimeFilled, Timer } from "carbon-icons-svelte";
	import Pill from "./general/Pill.svelte";

	export let game: Game;

	const elapsedTimeDynamic = game.elapsedTimeDynamic;

	$: currentTime = new Date(game.startTime + $elapsedTimeDynamic * 3600000).toLocaleTimeString("nl", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
	$: elapsedTimeFormatted = (() => {
		const totalMinutes = Math.floor($elapsedTimeDynamic * 60);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours}:${minutes.toString().padStart(2, "0")}`;
	})();

</script>


<div class="time-control">
	<Button
		kind="primary"
		size="small"
		iconDescription="Terugspoelen (xx minuten)"
		tooltipPosition="top"
		icon={SkipBackSolidFilled}
		on:click={() => game.changeStep("previous")}
	/>
	<Pill 
		icon={TimeFilled} 
		label="Time" 
		bind:value={currentTime}
	/>
	<Pill 
		icon={Timer} 
		label="Since Breach" 
		value={elapsedTimeFormatted}
		unit={"hours"}
	/>
	<Button
		kind="primary"
		size="small"
		iconDescription="Ga Verder (xx minuten)"
		tooltipPosition="top"
		icon={SkipForwardSolidFilled}
		on:click={() => game.changeStep("next")}
	/>
</div>


<style>
   .time-control {
		text-align: end;
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100%;
		column-gap: 0.5rem;
   }

</style>