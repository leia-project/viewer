<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Game } from "../module/game";
	import { SkipBackSolidFilled, SkipForwardSolidFilled, TimeFilled, Timer } from "carbon-icons-svelte";
	import Pill from "./general/Pill.svelte";
	import GameButton from "./general/GameButton.svelte";

	export let game: Game;

	const inPreparationPhase = game.inPreparationPhase;
	const elapsedTimeFormatted = game.elapsedTimeDynamicFormatted;
	const timeGaps = game.timeGaps;

	const currentTime = game.map.options.dateTime;
	$: currentTimeFormatted = new Date($currentTime).toLocaleTimeString("nl", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});

</script>


{#if $inPreparationPhase}
	<div class="prep-phase">
		<GameButton
			icon={SkipForwardSolidFilled}
			hasTooltip={false}
			size={18}
			borderHighlight={true}
			buttonText={$_("game.startFlood")}
			on:click={() => game.startBreach()}
		/>
	</div>
{:else}
	<div class="time-control">
		<div class="button-container" style="justify-content: flex-end;" >
			{#if $timeGaps.before}
				<GameButton
					icon={SkipBackSolidFilled}
					hasTooltip={true}
					size={18}
					borderHighlight={true}
					on:click={() => game.changeStep("previous")}
				>
					<svelte:fragment slot="popover">{$_("game.rewind")} (—{$timeGaps.before} {$_("game.hours")})</svelte:fragment>
				</GameButton>
			{/if}
		</div>
		<Pill 
			icon={TimeFilled}
			label={$_("game.time")}
			bind:value={currentTimeFormatted}
		/>
		<Pill 
			icon={Timer}
			label={`${$elapsedTimeFormatted.startsWith("-") ? $_("game.until") : $_("game.since")} ${$_("game.breach")}`}
			value={$elapsedTimeFormatted}
			unit={$_("game.hours")}
		/>
		<div class="button-container" style="justify-content: flex-start;" >
			{#if $timeGaps.after}
				<GameButton
					icon={SkipForwardSolidFilled}
					hasTooltip={true}
					size={18}
					borderHighlight={true}
					on:click={() => game.changeStep("next")}
				>
					<svelte:fragment slot="popover">{$_("game.proceed")} (+{$timeGaps.after} {$_("game.hours")})</svelte:fragment>
				</GameButton>
			{/if}
		</div>
	</div>
{/if}


<style>

	.prep-phase {
		height: 100%;
		display: flex;
		align-items: center;
		column-gap: 2rem;
	}

   .time-control {
		text-align: end;
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100%;
		column-gap: 0.5rem;
   }

	.button-container {
		min-width: 100px;
		display: flex;
		margin: 0 0.5rem;
	}

</style>