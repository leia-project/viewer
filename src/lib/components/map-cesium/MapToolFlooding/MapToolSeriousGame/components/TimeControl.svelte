<script lang="ts">
	import type { Game } from "../module/game";
	import { SkipBackSolidFilled, SkipForwardSolidFilled, TimeFilled, Timer } from "carbon-icons-svelte";
	import Pill from "./general/Pill.svelte";
	import GameButton from "./general/GameButton.svelte";

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
	<GameButton
		icon={SkipBackSolidFilled}
		hasTooltip={true}
		size={18}
		borderHighlight={true}
		on:click={() => game.changeStep("previous")}
	>
		<svelte:fragment slot="popover">Terugspoelen (xx minuten)</svelte:fragment>
	</GameButton>
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
	<GameButton
		icon={SkipForwardSolidFilled}
		hasTooltip={true}
		size={18}
		borderHighlight={true}
		on:click={() => game.changeStep("previous")}
	>
		<svelte:fragment slot="popover">Ga verder (xx minuten)</svelte:fragment>
	</GameButton>
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